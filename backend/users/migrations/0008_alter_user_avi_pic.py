# Generated by Django 5.0.8 on 2024-10-19 07:56

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0007_alter_user_avi_pic'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='avi_pic',
            field=models.ImageField(blank=True, default='https://cyclesapp.s3.amazonaws.com/avi/default_avi.jpg', null=True, upload_to='avi/'),
        ),
    ]
