from rest_framework import serializers
from .models import Fellowship, Cell, BibleStudyClass

class FellowshipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fellowship
        fields = "__all__"

class CellSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cell
        fields = "__all__"

class BibleStudyClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = BibleStudyClass
        fields = "__all__"