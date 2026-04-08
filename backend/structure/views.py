from rest_framework import viewsets
from .models import Fellowship, Cell, BibleStudyClass
from .serializers import FellowshipSerializer, CellSerializer, BibleStudyClassSerializer
from rest_framework.permissions import IsAuthenticated

class FellowshipLeaderViewSet(viewsets.ModelViewSet):
    serializer_class = FellowshipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role == "pastor" or user.role == "staff":
            return Fellowship.objects.all()

        if user.role == "fellowship_leader":
            return Fellowship.objects.filter(leader=user)

        return Fellowship.objects.none()


class CellViewSet(viewsets.ModelViewSet):
    serializer_class = CellSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role == "pastor" or user.role == "staff":
            return Cell.objects.all()

        if user.role == "fellowship_leader":
            return Cell.objects.filter(fellowship__leader=user)

        if user.role == "cell_leader":
            return Cell.objects.filter(leader=user)

        return Cell.objects.none()


class BibleStudyClassViewSet(viewsets.ModelViewSet):
    queryset = BibleStudyClass.objects.all()
    serializer_class = BibleStudyClassSerializer
    permission_classes = [IsAuthenticated]