from django.conf import settings
from django.db import models


User = settings.AUTH_USER_MODEL


class Fellowship(models.Model):
    name = models.CharField(max_length=255, unique=True, db_index=True)
    leader = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="led_fellowships",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Cell(models.Model):
    name = models.CharField(max_length=255)
    fellowship = models.ForeignKey(Fellowship, on_delete=models.CASCADE, related_name="cells")
    leader = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="led_cells",
    )
    meeting_day = models.CharField(max_length=20)
    meeting_time = models.TimeField()
    venue = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["fellowship", "name"], name="uniq_cell_name_per_fellowship"),
        ]
        indexes = [
            models.Index(fields=["fellowship", "name"]),
            models.Index(fields=["leader"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.fellowship.name}"


class BibleStudyClass(models.Model):
    name = models.CharField(max_length=255)
    cell = models.ForeignKey(Cell, on_delete=models.CASCADE, related_name="classes")
    teacher = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="teaching_classes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["cell", "name"], name="uniq_class_name_per_cell"),
        ]
        indexes = [
            models.Index(fields=["cell", "name"]),
            models.Index(fields=["teacher"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.cell.name})"
