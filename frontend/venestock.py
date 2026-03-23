import uuid
import warnings
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.query import Query
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os


# Cargar variables desde el archivo .env
load_dotenv() 

PROJECT_ID = os.getenv('VITE_APPWRITE_PROJECT_ID')
API_KEY = os.getenv('APPWRITE_API_KEY')
DATABASE_ID = os.getenv('VITE_APPWRITE_DATABASE_ID')
COLLECTION_ID = os.getenv('VITE_APPWRITE_COLLECTION_ID')
ENDPOINT = os.getenv('VITE_APPWRITE_ENDPOINT')

client = Client()
client.set_endpoint(ENDPOINT)
client.set_project(PROJECT_ID)
client.set_key(API_KEY)

databases = Databases(client)

ROLES = ["ADMIN", "GERENTE", "ALMACENISTA", "OPERADOR_POS"]

def generate_key():
    return f"VENE-{str(uuid.uuid4())[:8].upper()}-{str(uuid.uuid4())[9:13].upper()}"

def select_role():
    print("\nSeleccione el Rol:")
    for i, role in enumerate(ROLES):
        print(f"{i+1}. {role}")
    idx = input("Opción (1-4): ")
    try:
        return ROLES[int(idx)-1]
    except:
        return "ADMIN"

def create_license(owner_name, days_valid=None):
    key = generate_key()
    expiration_date = None
    role = select_role()
    
    if days_valid:
        expiration_date = (datetime.now() + timedelta(days=int(days_valid))).isoformat()

    try:
        data = {
            'key': key,
            'owner_name': owner_name,
            'status': 'active',
            'machine_id': '',
            'role': role
        }
        if expiration_date:
            data['expiration_date'] = expiration_date

        databases.create_document(
            database_id=DATABASE_ID,
            collection_id=COLLECTION_ID,
            document_id='unique()',
            data=data
        )
        print(f"\n[ÉXITO] Licencia creada para: {owner_name}")
        print(f"Llave: {key}")
        print(f"Rol: {role}")
        print(f"Expira: {expiration_date or 'VITALICIA'}\n")
    except Exception as e:
        print(f"[ERROR] No se pudo crear la licencia: {e}")

def list_licenses():
    try:
        response = databases.list_documents(
            database_id=DATABASE_ID, 
            collection_id=COLLECTION_ID,
            queries=[Query.limit(1000)]
        )
        
        documents = response['documents']
        
        if not documents:
            print("\n[!] No hay licencias registradas.\n")
            return

        print(f"\n--- LISTADO DE LICENCIAS ({len(documents)}) ---")
        print(f"{'ESTADO':<8} | {'CLIENTE':<15} | {'ROL':<12} | {'LLAVE':<20} | {'VINCULADA':<5}")
        print("-" * 90)
        
        for doc in documents:
            status_icon = "ACTIVA" if doc['status'] == 'active' else "BLOQ"
            role = doc.get('role', 'ADMIN')
            vinc = "SÍ" if doc.get('machine_id') else "NO"
            print(f"{status_icon:<8} | {doc['owner_name']:<15} | {role:<12} | {doc['key']:<20} | {vinc}")
            
        print("-" * 90 + "\n")
    except Exception as e:
        print(f"[ERROR] No se pudo listar: {e}")

def reset_hardware(key):
    try:
        response = databases.list_documents(
            database_id=DATABASE_ID,
            collection_id=COLLECTION_ID,
            queries=[Query.equal('key', key)]
        )
        if not response['documents']:
            print("[ERROR] Licencia no encontrada.")
            return
        
        doc = response['documents'][0]
        databases.update_document(
            database_id=DATABASE_ID,
            collection_id=COLLECTION_ID,
            document_id=doc['$id'],
            data={'machine_id': ''}
        )
        print(f"\n[ÉXITO] Hardware reseteado para {doc['owner_name']}. Ahora puede activarse en otra PC.\n")
    except Exception as e:
        print(f"[ERROR] No se pudo resetear: {e}")

def change_role(key):
    try:
        response = databases.list_documents(
            database_id=DATABASE_ID,
            collection_id=COLLECTION_ID,
            queries=[Query.equal('key', key)]
        )
        if not response['documents']:
            print("[ERROR] Licencia no encontrada.")
            return
        
        doc = response['documents'][0]
        new_role = select_role()
        
        databases.update_document(
            database_id=DATABASE_ID,
            collection_id=COLLECTION_ID,
            document_id=doc['$id'],
            data={'role': new_role}
        )
        print(f"\n[ÉXITO] Rol de {doc['owner_name']} cambiado a {new_role}.\n")
    except Exception as e:
        print(f"[ERROR] No se pudo cambiar el rol: {e}")

def upgrade_to_pro(key):
    try:
        response = databases.list_documents(
            database_id=DATABASE_ID,
            collection_id=COLLECTION_ID,
            queries=[Query.equal('key', key)]
        )
        if not response['documents']:
            print("[ERROR] Licencia no encontrada.")
            return
        
        doc = response['documents'][0]
        url = input("Turso DB URL (libsql://...): ")
        token = input("Turso Auth Token: ")
        
        databases.update_document(
            database_id=DATABASE_ID,
            collection_id=COLLECTION_ID,
            document_id=doc['$id'],
            data={
                'turso_db_url': url,
                'turso_auth_token': token
            }
        )
        print(f"\n[ÉXITO] Licencia de {doc['owner_name']} actualizada a PRO.\n")
    except Exception as e:
        print(f"[ERROR] No se pudo actualizar: {e}")

if __name__ == "__main__":
    print("\n=== VenoStock Admin Tool v2.0 ===")
    while True:
        print("1. Generar Nueva Licencia")
        print("2. Listar Licencias")
        print("3. Resetear Hardware (Machine ID)")
        print("4. Cambiar Rol de Usuario")
        print("5. Actualizar a PRO (Turso Sync)")
        print("6. Salir")
        choice = input("\nSeleccione opción: ")
        
        if choice == '1':
            name = input("Nombre del Cliente: ")
            days = input("Días de validez (Enter para Vitalicia): ")
            create_license(name, days if days.isdigit() else None)
        elif choice == '2':
            list_licenses()
        elif choice == '3':
            key = input("LLave de la licencia a resetear: ")
            reset_hardware(key)
        elif choice == '4':
            key = input("LLave de la licencia a modificar: ")
            change_role(key)
        elif choice == '5':
            key = input("LLave de la licencia a actualizar: ")
            upgrade_to_pro(key)
        elif choice == '6':
            break
