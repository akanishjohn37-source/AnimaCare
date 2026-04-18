from django.urls import path
from .views import ZoonoticHeatmapView, BroadcastAlertView, PublicHealthAnalyticsView

urlpatterns = [
    path('heatmap/', ZoonoticHeatmapView.as_view(), name='zoonotic-heatmap'),
    path('broadcast/', BroadcastAlertView.as_view(), name='civic-broadcast'),
    path('analytics/', PublicHealthAnalyticsView.as_view(), name='health-analytics'),
]
