// test.js
const kmeansModule = require('ml-kmeans');

console.log("Contenido de kmeansModule:", kmeansModule); // Mostramos todo el módulo

let data = [
    [1, 2],
    [1, 4],
    [1, 0],
    [4, 2],
    [4, 4],
    [4, 0]
];

try {
    // Intentamos acceder a la función si está dentro del objeto
    let kmeans = kmeansModule.kmeans || kmeansModule.default; // Accedemos correctamente a la función
    let ans = kmeans(data, 2);
    console.log("Resultados de KMeans:", ans);
} catch (error) {
    console.error("Error ejecutando KMeans:", error);
}
