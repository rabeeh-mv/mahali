from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from .models import House, Member, MemberObligation

@receiver(pre_save, sender=House)
@receiver(pre_save, sender=Member)
def set_sync_pending_on_save(sender, instance, **kwargs):
    """
    Whenever a Member or House is modified (and it's not simply clearing the sync flag itself),
    we enforce that sync_pending becomes True before it is saved.
    """
    update_fields = kwargs.get('update_fields')
    # If the only field being updated is 'sync_pending', don't override it to True
    if update_fields is not None and set(update_fields) == {'sync_pending'}:
        return
        
    instance.sync_pending = True


@receiver(post_delete, sender=Member)
def set_house_sync_pending_on_member_delete(sender, instance, **kwargs):
    """
    When a Member is deleted, the frontend won't see this Member in the pending list.
    We instead must flag the House to sync.
    """
    if instance.house:
        instance.house.sync_pending = True
        instance.house.save(update_fields=['sync_pending'])


@receiver(post_save, sender=MemberObligation)
@receiver(post_delete, sender=MemberObligation)
def set_house_sync_pending_on_obligation_change(sender, instance, **kwargs):
    """
    Obligations are part of the Cloud Sync payload for the House's guardian.
    If an obligation changes, we flag the associated House.
    """
    if getattr(instance, 'member', None) and instance.member.house:
        instance.member.house.sync_pending = True
        instance.member.house.save(update_fields=['sync_pending'])



