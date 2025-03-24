import os
import pandas as pd
from flask import Flask, jsonify
from flask_cors import CORS
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import StandardScaler

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET'])
def home():
    return "Servidor Flask en funcionamiento. Usa /predict para obtener predicciones."

@app.route('/predict', methods=['GET'])
def predict():
    # Obtener la ruta del directorio donde está este script
    base_dir = os.path.dirname(os.path.abspath(__file__))

    # Construir las rutas completas a los archivos CSV
    todos_usuarios_path = os.path.join(base_dir, '..', 'routes', 'csv', 'todos_los_usuarios.csv')
    nuevo_usuario_path = os.path.join(base_dir, '..', 'routes', 'csv', 'nuevo_usuario.csv')
    mega_gym_dataset_path = os.path.join(base_dir, '..', 'routes', 'csv', 'megaGymDataset.csv')

    # Cargar los datasets
    todos_usuarios = pd.read_csv(todos_usuarios_path)
    nuevo_usuario = pd.read_csv(nuevo_usuario_path)
    mega_gym_dataset = pd.read_csv(mega_gym_dataset_path)

    # Concatenar los datos de usuarios
    usuarios = pd.concat([todos_usuarios, nuevo_usuario], ignore_index=True)

    # Limpieza de datos
    usuarios.drop_duplicates(inplace=True)
    mega_gym_dataset = mega_gym_dataset.fillna('desconocido')
    mega_gym_dataset['Rating'] = mega_gym_dataset['Rating'].replace('desconocido', pd.NA)
    mega_gym_dataset['Rating'] = pd.to_numeric(mega_gym_dataset['Rating'], errors='coerce')
    mega_gym_dataset['Rating'] = mega_gym_dataset['Rating'].fillna(mega_gym_dataset['Rating'].mean())


    mega_gym_dataset['Type_orig'] = mega_gym_dataset['Type']
    mega_gym_dataset['BodyPart_orig'] = mega_gym_dataset['BodyPart']
    mega_gym_dataset['Equipment_orig'] = mega_gym_dataset['Equipment']
    mega_gym_dataset['Level_orig'] = mega_gym_dataset['Level']

    # Selección de características relevantes para K-means
    usuarios['genero'] = usuarios['genero'].map({'Masculino': 1, 'Femenino': 0})
    usuarios['nivel_actividad'] = usuarios['nivel_actividad'].map({'Bajo': 1, 'Moderado': 2, 'Alto': 3})
    usuarios['frecuencia_ejercicios'] = usuarios['frecuencia_ejercicios'].map({'nada': 0, 'poco ejercicio': 1, 'casi siempre': 2})

    features_kmeans = usuarios[['peso', 'estatura', 'nivel_actividad', 'porcentaje_masa_corporal', 'frecuencia_ejercicios', 'imc']]
    scaler = StandardScaler()
    features_scaled = scaler.fit_transform(features_kmeans)

    # Aplicar K-means
    kmeans = KMeans(n_clusters=3, random_state=0)
    usuarios['grupo_kmeans'] = kmeans.fit_predict(features_scaled)

    # Extraer el grupo del nuevo usuario
    nuevo_usuario_grupo = usuarios.iloc[-1]['grupo_kmeans']

    # Preparar los datos para Random Forest
    mega_gym_dataset['Type'] = mega_gym_dataset['Type'].factorize()[0]
    mega_gym_dataset['BodyPart'] = mega_gym_dataset['BodyPart'].factorize()[0]
    mega_gym_dataset['Equipment'] = mega_gym_dataset['Equipment'].factorize()[0]
    mega_gym_dataset['Level'] = mega_gym_dataset['Level'].factorize()[0]

    X = mega_gym_dataset[['Type', 'BodyPart', 'Equipment']]
    y = mega_gym_dataset['Level']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=0)
    
    rf_model = RandomForestClassifier(random_state=0)
    rf_model.fit(X_train, y_train)

    y_pred = rf_model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

     # Predecir para el nuevo usuario basado en su grupo de K-means
    nuevo_usuario_prediccion = rf_model.predict([[nuevo_usuario_grupo, 0, 0]])  # Ajustar según sea necesario
    
    # Obtener el valor de la predicción (asumiendo que es un array de un solo elemento)
    nuevo_usuario_prediccion = nuevo_usuario_prediccion[0]  # Esto te da el valor escalar

    # Filtrar el dataset para obtener toda la fila donde 'id' es igual a la predicción
    resultados = mega_gym_dataset[mega_gym_dataset['id'] == nuevo_usuario_prediccion]


    # Convertir el resultado a un diccionario para la respuesta JSON
    resultados_dict = resultados[['id', 'Title', 'Desc', 'Type_orig', 'BodyPart_orig', 
                                  'Equipment_orig', 'Level_orig', 'Rating', 'RatingDesc']].to_dict(orient='records')

    # Devolver la precisión y los resultados como JSON
    return jsonify({
        'accuracy': accuracy,
        'grupo_kmeans': int(nuevo_usuario_grupo),
        'prediccion': int(nuevo_usuario_prediccion),
        'resultados': resultados_dict
    })


if __name__ == '__main__':
    app.run(debug=True)
