# Importar todos los modelos aquí para que SQLAlchemy los registre
# y pueda crear las tablas con Base.metadata.create_all()
from app.models.usuario import Usuario
from app.models.asignacion import Asignacion
from app.models.dataset import Dataset
from app.models.clase import Clase
from app.models.salon import Salon
