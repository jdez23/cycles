# Generated by Django 5.0.8 on 2024-09-11 05:33

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_remove_user_header_pic'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='avi_pic',
            field=models.ImageField(default='media/default_avi.jpg', upload_to='avi/'),
        ),
    ]
