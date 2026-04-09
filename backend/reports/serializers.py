from rest_framework import serializers
from .models import CellReport, ReportImage, ReportComment

class ReportImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportImage
        fields = ["id", "image"]

class ReportCommentSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField()

    class Meta:
        model = ReportComment
        fields = ["id", "author", "comment", "created_at"]

class CellReportSerializer(serializers.ModelSerializer):
    images = ReportImageSerializer(many=True, read_only=True)
    comments = ReportCommentSerializer(many=True, read_only=True)

    class Meta:
        model = CellReport
        fields = "__all__"

class CreateReportSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True
    )

    class Meta:
        model = CellReport
        fields = "__all__"

    def validate(self, data):
        images = data.get("images", [])
        if len(images) < 1:
            raise serializers.ValidationError("At least one image is required.")
        return data

    def create(self, validated_data):
        images = validated_data.pop("images")
        report = CellReport.objects.create(**validated_data)

        for img in images:
            ReportImage.objects.create(report=report, image=img)

        return report