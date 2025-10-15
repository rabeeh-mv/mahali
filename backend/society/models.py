from django.db import models, transaction
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError
from django.db.models import Max


class Area(models.Model):
    id = models.AutoField(primary_key=True)  # Starts from 1 by default
    name = models.CharField(max_length=100, unique=True, db_index=True)  # Indexed for fast lookups
    description = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class House(models.Model):
    home_id = models.CharField(max_length=50, unique=True, db_index=True)  # Custom sequential ID, indexed
    house_name = models.CharField(max_length=100)
    family_name = models.CharField(max_length=100)
    location_name = models.CharField(max_length=100)
    area = models.ForeignKey(Area, on_delete=models.CASCADE, related_name='houses', db_index=True)  # Indexed
    address = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.house_name} ({self.family_name})"

    def save(self, *args, **kwargs):
        if not self.home_id:
            # Auto-generate sequential ID starting from '1001'
            with transaction.atomic():
                max_id = House.objects.aggregate(max_id=Max('home_id'))['max_id']
                if max_id:
                    next_id = str(int(max_id) + 1)
                else:
                    next_id = '1001'
                self.home_id = next_id
        super().save(*args, **kwargs)


class Member(models.Model):
    STATUS_CHOICES = [
        ('live', 'Live'),
        ('dead', 'Dead'),
        ('terminated', 'Terminated'),
    ]

    member_id = models.CharField(max_length=50, unique=True, db_index=True)  # Custom sequential ID, indexed
    name = models.CharField(max_length=100)  # Added name field
    house = models.ForeignKey(House, null=True, blank=True, on_delete=models.SET_NULL, related_name='members', db_index=True)  # Reverse rel + index
    adhar = models.CharField(max_length=12, null=True, blank=True, validators=[RegexValidator(r'^\d{12}$')])
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='live', db_index=True)  # Indexed for filters
    date_of_birth = models.DateField()
    date_of_death = models.DateField(null=True, blank=True)
    mother_name = models.CharField(max_length=100, blank=True)
    mother_surname = models.CharField(max_length=100, blank=True)
    mother = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='children_as_mother')
    father_name = models.CharField(max_length=100, blank=True)
    father_surname = models.CharField(max_length=100, blank=True)
    father = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='children_as_father')
    photo = models.ImageField(upload_to='members/photos/', null=True, blank=True)
    phone = models.CharField(max_length=15, null=True, blank=True)
    whatsapp = models.CharField(max_length=15, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.member_id} - {self.name}"

    def clean(self):
        if self.date_of_death and self.date_of_death < self.date_of_birth:
            raise ValidationError("Date of death cannot be before date of birth.")

    def save(self, *args, **kwargs):
        if not self.member_id:
            # Auto-generate sequential ID starting from '1001'
            with transaction.atomic():
                max_id = Member.objects.aggregate(max_id=Max('member_id'))['max_id']
                if max_id:
                    next_id = str(int(max_id) + 1)
                else:
                    next_id = '1001'
                self.member_id = next_id
        super().save(*args, **kwargs)


# Payments Models

class Collection(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class SubCollection(models.Model):
    id = models.AutoField(primary_key=True)
    collection = models.ForeignKey(Collection, on_delete=models.CASCADE, related_name='subcollections', db_index=True)
    year = models.CharField(max_length=4, db_index=True)  # e.g., '2025'
    name = models.CharField(max_length=100)  # e.g., 'Eid Paisa 2025'
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)  # Default amount per member
    due_date = models.DateField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('collection', 'year')  # Prevent duplicates per year

    def __str__(self):
        return f"{self.name} ({self.year})"


class MemberObligation(models.Model):  # The through-table for member-subcollection relations
    PAID_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('partial', 'Partial'),  # Added for flexibility; remove if not needed
    ]

    id = models.AutoField(primary_key=True)
    subcollection = models.ForeignKey(SubCollection, on_delete=models.CASCADE, related_name='obligations', db_index=True)
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='obligations', db_index=True)
    area = models.ForeignKey(Area, on_delete=models.SET_NULL, null=True, db_index=True)  # Denormalized for fast area queries
    amount = models.DecimalField(max_digits=10, decimal_places=2)  # Can override subcollection.amount
    paid_status = models.CharField(max_length=20, choices=PAID_STATUS_CHOICES, default='pending', db_index=True)  # Indexed for filters
    created_at = models.DateTimeField(auto_now_add=True)  # Full datetime; use .year for year-only
    updated_at = models.DateTimeField(auto_now=True)  # Assuming "updatedId" means timestamp

    class Meta:
        unique_together = ('subcollection', 'member')  # No duplicate obligations
        indexes = [
            models.Index(fields=['subcollection', 'paid_status']),  # For quick unpaid lists per subcollection
            models.Index(fields=['member', 'subcollection']),  # For member-specific queries
        ]

    def save(self, *args, **kwargs):
        if not self.area and self.member.house:
            self.area = self.member.house.area  # Auto-denormalize area from member's house
        super().save(*args, **kwargs)
