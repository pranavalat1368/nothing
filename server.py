import os
from flask import Flask, render_template, request, jsonify
from datetime import datetime

app = Flask(__name__, static_folder='.', static_url_path='/')

# Simple in-memory storage
reservations = []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/menu')
def menu():
    return render_template('menu.html')

@app.route('/api/reserve', methods=['POST'])
def reserve_table():
    try:
        data = request.json
        
        if not all(key in data for key in ['name', 'email', 'date', 'time', 'guests']):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        reservation = {
            'id': len(reservations) + 1,
            'name': data['name'],
            'email': data['email'],
            'date': data['date'],
            'time': data['time'],
            'guests': data['guests'],
            'created_at': datetime.now().isoformat()
        }
        
        reservations.append(reservation)
        
        return jsonify({
            'success': True,
            'message': 'Reservation confirmed!',
            'reservation_id': reservation['id']
        }), 201
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/reservations', methods=['GET'])
def get_reservations():
    return jsonify(reservations), 200

@app.route('/api/reservations/<int:reservation_id>', methods=['GET'])
def get_reservation(reservation_id):
    for res in reservations:
        if res['id'] == reservation_id:
            return jsonify(res), 200
    return jsonify({'success': False, 'message': 'Reservation not found'}), 404

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200

@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'message': 'Not found'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'success': False, 'message': 'Server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)