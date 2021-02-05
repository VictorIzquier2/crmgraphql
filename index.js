const {ApolloServer, gql} = require('apollo-server');
const typeDefs = require('./db/Schema');
const resolvers = require('./db/resolvers');
const conectarDB = require('./config/db');

// Conectar a la base de datos
conectarDB();

// Servidor
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: () => {
    const usuarioId = 20;
    return {
      usuarioId
    }
  }
});

// Arrancar el Servidor
server.listen().then(({url}) => {
  console.log(`Servidor listo en la URL ${url}`);
})