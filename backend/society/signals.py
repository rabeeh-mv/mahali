from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from .models import House, Member, RecentAction
from django.forms.models import model_to_dict
import datetime

def serialize_val(val):
    if isinstance(val, (datetime.date, datetime.datetime)):
        return val.isoformat()
    return str(val) if val is not None else None

@receiver(pre_save, sender=House)
@receiver(pre_save, sender=Member)
def capture_old_state(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = sender.objects.get(pk=instance.pk)
            instance._old_instance = old
        except sender.DoesNotExist:
            pass

@receiver(post_save, sender=House)
def log_house_save(sender, instance, created, **kwargs):
    if created:
        RecentAction.objects.create(
            model_name='House',
            object_id=str(instance.home_id),
            action_type='CREATE',
            description=f"House created: {instance.house_name}",
            fields_changed={}
        )
    else:
        old = getattr(instance, '_old_instance', None)
        if old:
            changes = {}
            # Fields to track for House
            fields = ['home_id', 'house_name', 'family_name', 'location_name']
            
            for f in fields:
                old_val = getattr(old, f)
                new_val = getattr(instance, f)
                if old_val != new_val:
                    changes[f] = {'old': serialize_val(old_val), 'new': serialize_val(new_val)}
            
            if changes:
                RecentAction.objects.create(
                    model_name='House',
                    object_id=str(instance.home_id),
                    action_type='UPDATE',
                    description=f"House updated: {instance.house_name}",
                    fields_changed=changes
                )

@receiver(post_save, sender=Member)
def log_member_save(sender, instance, created, **kwargs):
    if created:
        RecentAction.objects.create(
            model_name='Member',
            object_id=str(instance.member_id),
            action_type='CREATE',
            description=f"Member created: {instance.name}",
            fields_changed={}
        )
    else:
        old = getattr(instance, '_old_instance', None)
        if old:
            changes = {}
            # Fields to track for Member
            fields = ['member_id', 'name', 'surname', 'date_of_birth', 'adhar', 'isGuardian', 'status']
            
            # Helper to check foreign keys if needed (e.g. house change)
            if old.house != instance.house:
                old_h = old.house.home_id if old.house else None
                new_h = instance.house.home_id if instance.house else None
                changes['house'] = {'old': old_h, 'new': new_h}

            for f in fields:
                old_val = getattr(old, f)
                new_val = getattr(instance, f)
                if old_val != new_val:
                    changes[f] = {'old': serialize_val(old_val), 'new': serialize_val(new_val)}
            
            if changes:
                # IMPORTANT: If Guardian status changes, or Name of Guardian changes, flag it
                desc = f"Member updated: {instance.name}"
                if 'isGuardian' in changes:
                    desc += " (Guardian Status Changed)"
                
                RecentAction.objects.create(
                    model_name='Member',
                    object_id=str(instance.member_id),
                    action_type='UPDATE',
                    description=desc,
                    fields_changed=changes
                )

@receiver(post_delete, sender=House)
def log_house_delete(sender, instance, **kwargs):
    RecentAction.objects.create(
        model_name='House',
        object_id=str(instance.home_id),
        action_type='DELETE',
        description=f"House deleted: {instance.house_name}",
        fields_changed={}
    )

@receiver(post_delete, sender=Member)
def log_member_delete(sender, instance, **kwargs):
    RecentAction.objects.create(
        model_name='Member',
        object_id=str(instance.member_id),
        action_type='DELETE',
        description=f"Member deleted: {instance.name}",
        fields_changed={}
    )

from .models import MemberObligation

@receiver(pre_save, sender=MemberObligation)
def capture_obligation_old_state(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = sender.objects.get(pk=instance.pk)
            instance._old_instance = old
        except sender.DoesNotExist:
            pass

@receiver(post_save, sender=MemberObligation)
def log_obligation_save(sender, instance, created, **kwargs):
    if created:
        RecentAction.objects.create(
            model_name='Obligation',
            object_id=str(instance.id),
            action_type='CREATE',
            description=f"Obligation assigned: {instance.subcollection.name} to {instance.member.name}",
            fields_changed={}
        )
    else:
        old = getattr(instance, '_old_instance', None)
        if old:
            changes = {}
            fields = ['amount', 'paid_status']
            
            for f in fields:
                old_val = getattr(old, f)
                new_val = getattr(instance, f)
                if old_val != new_val:
                    changes[f] = {'old': serialize_val(old_val), 'new': serialize_val(new_val)}
            
            if changes:
                RecentAction.objects.create(
                    model_name='Obligation',
                    object_id=str(instance.id),
                    action_type='UPDATE',
                    description=f"Obligation updated: {instance.subcollection.name} for {instance.member.name}",
                    fields_changed=changes
                )

