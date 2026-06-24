import os
import json
from flask import Flask, render_template, request, jsonify, redirect
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session

app = Flask(__name__, static_folder='.', static_url_path='/')

# Database Setup
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    # Fallback for local development
    DATABASE_URL = 'sqlite:///bella_cucina.db'

# Handle Render's postgres:// to postgresql://
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
Session = scoped_session(sessionmaker(bind=engine))
Base = declarative_base()

# Database Models
class Reservation(Base):
    __tablename__ = 'reservations'
    
    id = Column(String, primary_key=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(100), default='')
    date = Column(String(20), nullable=False)
    time = Column(String(10), nullable=False)
    guests = Column(Integer, nullable=False)
    occasion = Column(String(200), default='')
    notes = Column(Text, default='')
    status = Column(String(20), default='pending')
    created_at = Column(DateTime, default=datetime.now)

class MenuItem(Base):
    __tablename__ = 'menu_items'
    
    id = Column(String, primary_key=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)
    price = Column(String(10), nullable=False)
    description = Column(Text, default='')
    tag = Column(String(50), default='')
    dietary = Column(Text, default='[]')

class User(Base):
    __tablename__ = 'users'
    
    id = Column(String, primary_key=True)
    email = Column(String(100), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.now)

class Order(Base):
    __tablename__ = 'orders'
    
    id = Column(String, primary_key=True)
    reservation_id = Column(String, nullable=True)
    items = Column(Text, nullable=False)  # JSON string
    status = Column(String(20), default='pending')
    total_price = Column(String(10), default='0')
    created_at = Column(DateTime, default=datetime.now)

# Create all tables
Base.metadata.create_all(engine)

# Seed database if empty or schema has changed
def seed_database():
    session = Session()
    try:
        try:
            # Check if columns are accessible
            session.query(MenuItem).first()
        except Exception:
            session.rollback()
            # If query fails (e.g. missing columns), drop and recreate only the menu_items table
            print("Schema mismatch in menu_items table, recreating it...")
            MenuItem.__table__.drop(engine, checkfirst=True)
            MenuItem.__table__.create(engine)
            
        if session.query(MenuItem).count() == 0:
            menu_json_path = os.path.join(os.path.dirname(__file__), 'data', 'menu.json')
            if os.path.exists(menu_json_path):
                with open(menu_json_path, 'r') as f:
                    data = json.load(f)
                    for item in data.get('items', []):
                        menu_item = MenuItem(
                            id=item['id'],
                            name=item['name'],
                            category=item['category'],
                            price=item['price'],
                            description=item.get('description', ''),
                            tag=item.get('tag', ''),
                            dietary=json.dumps(item.get('dietary', []))
                        )
                        session.add(menu_item)
                session.commit()
                print("Database seeded successfully with menu items.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        session.rollback()
    finally:
        session.close()

seed_database()

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/index.html')
def index_html_redirect():
    return redirect('/')

@app.route('/menu')
def menu():
    return render_template('menu.html')

@app.route('/menu.html')
def menu_html_redirect():
    return redirect('/menu')

@app.route('/admin')
def admin_dashboard():
    return render_template('admin.html')

@app.route('/api/menu', methods=['GET'])
def get_menu():
    try:
        session = Session()
        items = session.query(MenuItem).all()
        
        # Group by category
        menu_data = {"categories": set(), "items": []}
        for item in items:
            menu_data["categories"].add(item.category)
            
            # Parse dietary if stored as JSON list
            dietary_list = []
            if item.dietary:
                try:
                    dietary_list = json.loads(item.dietary)
                except Exception:
                    dietary_list = [d.strip() for d in item.dietary.split(',') if d.strip()]
                    
            menu_data["items"].append({
                'id': item.id,
                'name': item.name,
                'category': item.category,
                'price': item.price,
                'description': item.description,
                'tag': item.tag,
                'dietary': dietary_list
            })
        
        menu_data["categories"] = list(menu_data["categories"])
        session.close()
        
        return jsonify(menu_data), 200
    except Exception as e:
        print(f"Error fetching menu: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/reservations', methods=['POST'])
def reserve_table():
    try:
        data = request.json
        session = Session()
        
        # Mandatory validation checks
        required_fields = ['name', 'phone', 'date', 'time', 'guests']
        if not all(key in data and str(data[key]).strip() for key in required_fields):
            session.close()
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        # Create new reservation
        reservation = Reservation(
            id=f"res_{int(datetime.now().timestamp() * 1000)}",
            name=data['name'],
            phone=data['phone'],
            email=data.get('email', ''),
            date=data['date'],
            time=data['time'],
            guests=int(data['guests']),
            occasion=data.get('occasion', ''),
            notes=data.get('notes', ''),
            status='pending'
        )
        
        session.add(reservation)
        session.commit()
        session.close()
        
        return jsonify({
            'success': True,
            'message': 'Reservation confirmed!',
            'reservation': {
                'id': reservation.id,
                'name': reservation.name,
                'phone': reservation.phone,
                'email': reservation.email,
                'date': reservation.date,
                'time': reservation.time,
                'guests': reservation.guests,
                'occasion': reservation.occasion,
                'notes': reservation.notes,
                'status': reservation.status,
                'createdAt': reservation.created_at.isoformat()
            }
        }), 201
    
    except Exception as e:
        print(f"Error creating reservation: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/reservations', methods=['GET'])
def get_reservations():
    try:
        session = Session()
        reservations = session.query(Reservation).all()
        
        result = [{
            'id': res.id,
            'name': res.name,
            'phone': res.phone,
            'email': res.email,
            'date': res.date,
            'time': res.time,
            'guests': res.guests,
            'occasion': res.occasion,
            'notes': res.notes,
            'status': res.status,
            'createdAt': res.created_at.isoformat()
        } for res in reservations]
        
        session.close()
        return jsonify(result), 200
    except Exception as e:
        print(f"Error fetching reservations: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/reservations/<reservation_id>', methods=['GET'])
def get_reservation(reservation_id):
    try:
        session = Session()
        res = session.query(Reservation).filter(Reservation.id == reservation_id).first()
        
        if not res:
            session.close()
            return jsonify({'success': False, 'message': 'Reservation not found'}), 404
        
        result = {
            'id': res.id,
            'name': res.name,
            'phone': res.phone,
            'email': res.email,
            'date': res.date,
            'time': res.time,
            'guests': res.guests,
            'occasion': res.occasion,
            'notes': res.notes,
            'status': res.status,
            'createdAt': res.created_at.isoformat()
        }
        
        session.close()
        return jsonify(result), 200
    except Exception as e:
        print(f"Error fetching reservation: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/reservations/<reservation_id>', methods=['PATCH'])
def update_reservation(reservation_id):
    try:
        data = request.json
        status = data.get('status')
        
        if not status or status not in ['pending', 'confirmed', 'cancelled']:
            return jsonify({'success': False, 'message': 'Invalid status'}), 400
        
        session = Session()
        res = session.query(Reservation).filter(Reservation.id == reservation_id).first()
        
        if not res:
            session.close()
            return jsonify({'success': False, 'message': 'Reservation not found'}), 404
        
        res.status = status
        session.commit()
        session.close()
        
        return jsonify({'success': True, 'message': f'Reservation status updated to {status}'}), 200
    except Exception as e:
        print(f"Error updating reservation: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/reservations/<reservation_id>', methods=['DELETE'])
def delete_reservation(reservation_id):
    try:
        session = Session()
        res = session.query(Reservation).filter(Reservation.id == reservation_id).first()
        
        if not res:
            session.close()
            return jsonify({'success': False, 'message': 'Reservation not found'}), 404
        
        session.delete(res)
        session.commit()
        session.close()
        
        return jsonify({'success': True, 'message': 'Reservation deleted successfully'}), 200
    except Exception as e:
        print(f"Error deleting reservation: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

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
    app.run(host='0.0.0.0', port=port, debug=True)