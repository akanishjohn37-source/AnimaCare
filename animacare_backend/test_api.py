import requests

login_res = requests.post('http://127.0.0.1:8000/api/auth/login/', json={
    'username': 'vet1',
    'password': 'password123'
})

print("Login:", login_res.status_code, login_res.text)

if login_res.status_code == 200:
    token = login_res.json().get('token')
    post_res = requests.post('http://127.0.0.1:8000/api/clinical/consultations/', json={
        'pet': 10,
        'vital_signs': {'weight': '12', 'temp': '38', 'heartRate': ''},
        'consultation_notes': 'test',
        'zoonotic_disease_flag': None,
        'media_url': None
    }, headers={'Authorization': f'Bearer {token}'})
    
    print("Post:", post_res.status_code, post_res.text)
