const express = require('express');
const cors = require('cors'); // Importar el paquete CORS
const path = require('path');
const mysql = require('mysql2');
const pdf = require('pdfkit');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware para habilitar CORS
app.use(cors({ origin: 'https://miguelcg17.github.io' })); // Permitir solo tu frontend en GitHub Pages
// Si deseas permitir todos los orígenes (no recomendado en producción):
// app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para servir imágenes estáticas
app.use('/images', express.static(path.join(__dirname, '..', 'images')));

// Configuración de la base de datos
const dbUrl = process.env.DB_URL;
const db = mysql.createPool(dbUrl);

// Rutas
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const validUsername = 'admin';
    const validPassword = 'admin123';

    if (username === validUsername && password === validPassword) {
        res.redirect('/admin');
    } else {
        res.send('<h1>Credenciales incorrectas. Por favor, intenta de nuevo.</h1><a href="/login">Volver a intentar</a>');
    }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/usuario', (req, res) => {
    res.sendFile(path.join(__dirname, 'usuario.html'));
});

app.get('/animales', (req, res) => {
    const query = 'SELECT * FROM animal';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener los datos:', err.message);
            return res.status(500).send('Error al obtener los datos.');
        }
        res.json(results);
    });
});

app.post('/animales', (req, res) => {
    const { Nombre, Especie, Edad, Habitat, dieta = 'Desconocido', Estado_Conservacion, Pais_Origen, Descripcion } = req.body;
    const Link = `/images/habitats/${Habitat.toLowerCase()}.jpg`;

    const query = `INSERT INTO animal (Nombre, Especie, Edad, Habitat, dieta, Estado_Conservacion, Pais_Origen, Descripcion, Link)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(query, [Nombre, Especie, Edad, Habitat, dieta, Estado_Conservacion, Pais_Origen, Descripcion, Link], (err, result) => {
        if (err) {
            console.error('Error al insertar los datos:', err.message);
            return res.status(500).send('Error al insertar los datos.');
        }
        res.status(200).send('Animal agregado correctamente.');
    });
});

app.delete('/animales/:nombre', (req, res) => {
    const nombreAnimal = req.params.nombre;
    const query = 'DELETE FROM animal WHERE Nombre = ?';
    db.query(query, [nombreAnimal], (err, result) => {
        if (err) {
            console.error('Error al eliminar el animal:', err.message);
            return res.status(500).send('Error al eliminar el animal.');
        }
        res.status(200).send(`Animal ${nombreAnimal} eliminado correctamente.`);
    });
});

app.get('/animales/:nombre', (req, res) => {
    const nombreAnimal = req.params.nombre;
    const query = 'SELECT * FROM animal WHERE Nombre = ?';
    db.query(query, [nombreAnimal], (err, results) => {
        if (err) {
            console.error('Error al obtener el animal:', err.message);
            return res.status(500).send('Error al obtener el animal.');
        }

        if (results.length === 0) {
            return res.status(404).send(`No se encontró un animal con el nombre "${nombreAnimal}".`);
        }

        res.json(results[0]);
    });
});

app.get('/generar-pdf/:nombre', (req, res) => {
    const nombreAnimal = req.params.nombre;
    const query = 'SELECT * FROM animal WHERE Nombre = ?';
    db.query(query, [nombreAnimal], (err, results) => {
        if (err) {
            console.error('Error al obtener el animal para PDF:', err.message);
            return res.status(500).send('Error al obtener el animal para PDF.');
        }

        if (results.length === 0) {
            return res.status(404).send(`No se encontró un animal con el nombre "${nombreAnimal}".`);
        }

        const animal = results[0];
        const habitatImagePath = path.join(__dirname, '..', 'images', 'habitats', animal.Link.replace('/images/habitats/', ''));

        const doc = new pdf();
        doc.pipe(res);

        doc.fontSize(16).text(`Información del Animal: ${animal.Nombre}`, { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).text(`Especie: ${animal.Especie}`);
        doc.text(`Edad: ${animal.Edad} años`);
        doc.text(`Hábitat: ${animal.Habitat}`);
        doc.text(`Dieta: ${animal.dieta}`);
        doc.text(`Estado de Conservación: ${animal.Estado_Conservacion}`);
        doc.text(`País de Origen: ${animal.Pais_Origen}`);
        doc.text(`Descripción: ${animal.Descripcion}`);
        doc.moveDown();

        fs.exists(habitatImagePath, (exists) => {
            if (exists) {
                doc.image(habitatImagePath, { fit: [500, 400], align: 'center' });
            } else {
                doc.text('Imagen del hábitat no disponible.', { align: 'center' });
            }

            doc.end();
        });
    });
});

app.put('/animales/:nombre', (req, res) => {
    const nombreAnimal = req.params.nombre;
    const { Especie, Edad, Habitat, dieta = 'Desconocido', Estado_Conservacion, Pais_Origen, Descripcion } = req.body;

    const Link = `/images/habitats/${Habitat.toLowerCase()}.jpg`;

    const query = `UPDATE animal 
                   SET Especie = ?, Edad = ?, Habitat = ?, dieta = ?, Estado_Conservacion = ?, Pais_Origen = ?, Descripcion = ?, Link = ? 
                   WHERE Nombre = ?`;

    db.query(query, [Especie, Edad, Habitat, dieta, Estado_Conservacion, Pais_Origen, Descripcion, Link, nombreAnimal], (err, result) => {
        if (err) {
            console.error('Error al actualizar los datos:', err.message);
            return res.status(500).send('Error al actualizar los datos.');
        }

        if (result.affectedRows === 0) {
            return res.status(404).send(`No se encontró un animal con el nombre "${nombreAnimal}".`);
        }

        res.status(200).send('Animal actualizado correctamente.');
    });
});

app.listen(port, () => {
    console.log(`Servidor corriendo en ${port}`);
});


