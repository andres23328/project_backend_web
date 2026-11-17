# ⚙️ TrainSmart Backend — API REST Híbrida (MySQL + MongoDB) y Motor de Machine Learning

![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Relacional-4479A1?logo=mysql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas_%26_GridFS-47A248?logo=mongodb&logoColor=white)
![Python](https://img.shields.io/badge/Python-Flask_%26_Scikit--Learn-3776AB?logo=python&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens&logoColor=white)

Servidor backend y motor analítico para la plataforma **TrainSmart**. Combina una API REST en **Node.js + Express** con persistencia híbrida en **MySQL** y **MongoDB Atlas (GridFS)**, exportación automatizada de datasets en formato CSV y un pipeline de **Machine Learning** implementado tanto en JavaScript (`ml-kmeans`, `ml-random-forest`) como en Python (**Flask + Scikit-Learn**) para recomendar rutinas de entrenamiento personalizadas.

---

## ✨ Características Principales

- **Persistencia Políglota (MySQL + MongoDB):**
  - Almacenamiento estructurado de usuarios, métricas corporales (IMC, masa corporal magra) y credenciales cifradas (`bcrypt`) en **MySQL** (`db.js`).
  - Almacenamiento documental y gestión de imágenes de perfil mediante **MongoDB GridFSBucket** (`mondb.js`) y almacenamiento local con `Multer`.
- **Seguridad y Autenticación:** Cifrado de contraseñas con `bcrypt`, generación y validación de **JSON Web Tokens (JWT)** e integración con `google-auth-library`.
- **Pipeline de Datos Automatizado (CSV):** Exportación dinámica de perfiles de usuario hacia `todos_los_usuarios.csv` y `nuevo_usuario.csv` mediante `json2csv` para alimentar los modelos predictivos en tiempo real.
- **Doble Implementación de Machine Learning:**
  - **Módulo Node.js (`models/kmeansModel.js`):** Agrupamiento con `ml-kmeans` y clasificación con `ml-random-forest` ejecutados directamente en Express.
  - **Microservicio Python (`models/machine_learning.py`):** API en **Flask** con `scikit-learn` (`StandardScaler`, `KMeans` y `RandomForestClassifier`) que evalúa precisión (`accuracy_score`) y filtra ejercicios desde `megaGymDataset.csv`.

---

## 🛠️ Stack Tecnológico

| Área | Tecnologías |
| :--- | :--- |
| **Servidor Principal** | Node.js, Express.js, CORS, Body-Parser, Multer, json2csv, csvtojson |
| **Bases de Datos** | MySQL (`mysql2`), MongoDB Atlas (`mongodb` + `GridFSBucket`) |
| **Seguridad** | bcrypt, jsonwebtoken (JWT), google-auth-library |
| **Machine Learning (JS)** | `ml-kmeans`, `ml-random-forest`, `ml` |
| **Machine Learning (Python)** | Python 3, Flask, Flask-CORS, Pandas, Scikit-Learn |

---

## 📁 Estructura del Proyecto

```text
project_backend_web/
├── server.js                    # Servidor principal Express (puerto 5000)
├── db.js                        # Conexión a base de datos relacional MySQL (vida_fit2)
├── mondb.js                     # Conexión a MongoDB Atlas y carga de archivos con GridFS
├── models/
│   ├── kmeansModel.js           # Rutas y algoritmos K-Means + Random Forest en Node.js
│   ├── machine_learning.py      # Microservicio Flask con Scikit-Learn (/predict)
│   └── test.js                  # Pruebas de modelos predictivos
├── routes/
│   ├── userRoutes.js            # Registro, login, cálculo de IMC y exportación CSV (MySQL)
│   ├── mongo.js                 # Registro documental y gestión de imágenes (MongoDB)
│   ├── recommendationRoutes.js  # Endpoints de recomendaciones personalizadas
│   └── csv/                     # Datasets de entrenamiento (megaGymDataset.csv, usuarios)
└── package.json
```

---

## 🚀 Instalación y Ejecución Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/andres23328/project_backend_web.git
cd project_backend_web
```

### 2. Instalar dependencias de Node.js
```bash
npm install
```

### 3. Configurar Bases de Datos
1. **MySQL:** Crea una base de datos llamada `vida_fit2` y verifica las credenciales en `db.js` (`host`, `user`, `password`).
2. **MongoDB:** Configura tu cadena de conexión de MongoDB Atlas en `mondb.js` (o mediante variables de entorno `.env`).

### 4. Iniciar el Servidor API (Node.js)
```bash
node server.js
```
El servidor Express escuchará en `http://localhost:5000`.

### 5. (Opcional) Iniciar el Microservicio ML en Python
```bash
pip install flask flask-cors pandas scikit-learn
python models/machine_learning.py
```

---

## 🔌 Endpoints Principales

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/` | Verificación de estado de la API (`Bienvenido a la API de TrainSmart!`) |
| `POST` | `/api/registrar` | Registro de usuario en MySQL, cálculo de IMC/masa magra y actualización de CSV |
| `POST` | `/mongo/registrar` | Registro documental en MongoDB y almacenamiento de imagen |
| `GET` | `/api/predict` | Ejecución del modelo K-Means + Random Forest y retorno de ejercicios sugeridos |
| `POST` | `/api/recommendations` | Obtención de recomendaciones personalizadas según peso y estatura |

---

## 👤 Autor

**Andrés Felipe Ardila Ardila**  
Desarrollador Backend & Estudiante de Ingeniería de Sistemas — Villavicencio, Meta, Colombia  
- GitHub: [@andres23328](https://github.com/andres23328)
- Correo: ardila23328@gmail.com
