from django.urls import path
from planner import views

urlpatterns = [path("api/health/", views.health), path("api/csrf/", views.csrf), path("api/plan/", views.plan), path("api/plan/pdf/", views.plan_pdf), path("", views.index)]
