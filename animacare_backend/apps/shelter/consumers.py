import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ShelterDashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # We can implement specific room grouping based on shelter ID
        # e.g., self.room_name = f"shelter_{user.shelter.id}"
        self.room_group_name = 'shelters_group'
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from room group
    async def sos_alert(self, event):
        alert_data = event['alert_data']
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'sos_alert',
            'data': alert_data
        }))
