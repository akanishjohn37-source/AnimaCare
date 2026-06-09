import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ShelterDashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        from urllib.parse import parse_qs
        import re
        
        query_string = self.scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        zone = params.get('zone', [None])[0]
        
        cleaned_zone = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', zone) if zone else 'all'
        self.room_group_name = f"shelters_{cleaned_zone}"
        
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
