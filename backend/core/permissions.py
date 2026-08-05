from rest_framework.permissions import BasePermission


class IsSupplier(BasePermission):
    message = "Only supplier accounts can perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "SUPPLIER")


class IsBuyer(BasePermission):
    message = "Only buyer accounts can perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "BUYER")


class IsAdminRole(BasePermission):
    message = "Only admin accounts can perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "ADMIN")


class IsInvoiceSupplierOwner(BasePermission):
    """Object-level: the invoice's supplier must be the requesting user."""

    message = "You do not own this invoice."

    def has_object_permission(self, request, view, obj):
        return obj.supplier_id == request.user.id


class IsInvoiceBuyerOwner(BasePermission):
    """Object-level: the invoice's buyer must be the requesting user."""

    message = "This invoice was not issued to you."

    def has_object_permission(self, request, view, obj):
        return obj.buyer_id == request.user.id
