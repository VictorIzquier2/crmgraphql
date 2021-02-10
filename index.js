const {ApolloServer, gql} = require('apollo-server');
const typeDefs = require('./db/Schema');
const resolvers = require('./db/resolvers');
const conectarDB = require('./config/db');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: '.env'});

// Conectar a la base de datos
conectarDB();

// Servidor
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({req}) => {
    //console.log(req.headers['authorization'])
    const token = req.headers['authorization'] || '';

    //console.log(req.headers);

    if(token){
      try{
        const usuario = jwt.verify(token.replace('Bearer ', ''), process.env.SECRETA);
        console.log(usuario);
        return {
          usuario
        }
      }catch(err){
        console.log('Hubo un error',err);
      }
    }
  }
});

// Arrancar el Servidor
server.listen().then(({url}) => {
  console.log(`Servidor listo en la URL ${url}`);
})