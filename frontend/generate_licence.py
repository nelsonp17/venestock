import uuid
import warnings
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.query import Query # Importamos la clase Query
from datetime import datetime, timedelta

# Silenciar advertencias de deprecación
# warnings.filterwarnings("ignore", category=DeprecationWarning)

# --- CONFIGURACIÓN ---
PROJECT_ID = '69ab0d85002721c4effc'
API_KEY = 'standard_bf29d84ab40b09d176f7cfd432f5f82ce9e76d797bf804e2d1d89d07b79db0ecd893f72043e4d334eaa3df803295ffc71cf4fb60cfd6c20a89baa0b6cc3620a9ff5754c7e88ba1b286c92ffba8dbd66b7dcce39985bd22c76a0122a811e5721ac79a36a8c86655fb2dc29eeddeb340738e619aac6937b4ef2c83b51eacce2361'
DATABASE_ID = '69ab0f140034a79ea5b7'
COLLECTION_ID = 'venestock'
# ---------------------

client = Client()
client.set_endpoint('https://nyc.cloud.appwrite.io/v1')
client.set_project(PROJECT_ID)
client.set_key(API_KEY)

databases = Databases(client)

def generate_key():
    return f"VENE-{str(uuid.uuid4())[:8].upper()}-{str(uuid.uuid4())[9:13].upper()}"

def create_license(owner_name, days_valid=None):
    key = generate_key()
    expiration_date = None
    
    if days_valid:
        expiration_date = (datetime.now() + timedelta(days=int(days_valid))).isoformat()

    try:
        data = {
            'key': key,
            'owner_name': owner_name,
            'status': 'active',
            'machine_id': '',
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
        print(f"Expira: {expiration_date or 'NUNCA'}\n")
    except Exception as e:
        print(f"[ERROR] No se pudo crear la licencia: {e}")

def list_licenses():
    try:
        # Usamos Query.limit(100) para obtener todas las licencias
        response = databases.list_documents(
            database_id=DATABASE_ID, 
            collection_id=COLLECTION_ID,
            queries=[
                Query.limit(1000) # Formato correcto para el SDK moderno
            ]
        )
        
        documents = response['documents']
        # documents = response.documents
        
        if not documents:
            print("\n[!] No hay licencias registradas.\n")
            return

        print(f"\n--- LISTADO DE LICENCIAS ({len(documents)}) ---")
        print(f"{'ESTADO':<8} | {'CLIENTE':<15} | {'LLAVE':<20} | {'EXPIRA':<12} | {'PC ID'}")
        print("-" * 80)
        
        for doc in documents:
            status_icon = "ACTIVA" if doc['status'] == 'active' else "BLOQ"
            exp = doc.get('expiration_date', 'NUNCA')
            if exp:
                exp = exp[:10]
            else:
                exp = "VITALICIA"
                
            machine = doc.get('machine_id', '')
            if not machine:
                machine = "Pendiente..."
            else:
                machine = f"{machine[:12]}..." # Acortar el ID para que quepa en la tabla

            print(f"{status_icon:<8} | {doc['owner_name']:<15} | {doc['key']:<20} | {exp:<12} | {machine}")
            
        print("-" * 80 + "\n")
    except Exception as e:
        print(f"[ERROR] No se pudo listar: {e}")

if __name__ == "__main__":
    print("VeneStock License Manager")
    while True:
        print("1. Generar Nueva Licencia")
        print("2. Listar Licencias")
        print("3. Salir")
        choice = input("Seleccione: ")
        
        if choice == '1':
            name = input("Nombre del Cliente: ")
            days = input("Días de validez (Presione Enter para Vitalicia): ")
            create_license(name, days if days.isdigit() else None)
        elif choice == '2':
            list_licenses()
        elif choice == '3':
            break
