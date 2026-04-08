from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL

class Fellowship(models.Model):
    name = models.CharField(max_length=255)
    leader = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="led_fellowships")

    def __str__(self):
        return self.name
    class Meta:
        unique_together = ("name", "fellowship")
    
class Cell(models.Model):
    name = models.CharField(max_length=255)

    fellowship = models.ForeignKey(Fellowship, on_delete=models.CASCADE, related_name="cells")
    leader = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="led_cells")

    meeting_day = models.CharField(max_length=20)
    meeting_time = models.TimeField()
    venue = models.TextField()

    def __str__(self):
        return f"{self.name} - {self.fellowship.name}"
    class Meta:
        unique_together = ("name", "cell")

class BibleStudyClass(models.Model):
    name = models.CharField(max_length=255)

    cell = models.ForeignKey(Cell, on_delete=models.CASCADE, related_name="classes")
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="teaching_classes")
    class Meta:
        unique_together = ("name", "bible_study_class")

    def __str__(self):
        return f"{self.name} ({self.cell.name})"