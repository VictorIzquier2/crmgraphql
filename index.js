const {ApolloServer, gql} = require('apollo-server');
const typeDefs = require('./db/Schema');
const resolvers = require('./db/resolvers');

// Servidor
const server = new ApolloServer({
  typeDefs,
  resolvers
});

// Arrancar el Servidor
server.listen().then(({url}) => {
  console.log(`Servidor listo en la URL ${url}`);
})