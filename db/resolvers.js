
const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: '.env'});

// Crear el token
const crearToken = (usuario, secreta, expiresIn) => {

  const {id, email, nombre, apellido} = usuario;

  return jwt.sign({id, email, nombre, apellido}, secreta, {expiresIn})
}

// Resolvers
const resolvers = {
  Query: {
    obtenerUsuario: async (_, {token}) => {
      const usuarioId = await jwt.verify(token, process.env.SECRETA);

      return usuarioId;
    },

    obtenerProductos: async () => {
      try{
        const productos = await Producto.find({});
        return productos;
      }catch(err){
        console.log(err);
      }
    },

    obtenerProducto: async (_, {id}) => {
      
      // Revisar si el producto existe o no
      const producto = await Producto.findById(id);
      if(!producto) {
        throw new Error('Producto no encontrado');
      }else{
        return producto;
      }
    },

    obtenerClientes: async () => {
      try {
        const clientes = await Cliente.find({});
        return clientes;
      }catch(err){
        console.log(err);
      }
    },

    obtenerClientesVendedor: async (_, {}, ctx) => {
      try {
        const clientes = await Cliente.find({vendedor: ctx.usuario.id.toString()});
        return clientes;
      }catch(err){
        console.log(err);
      }
    },

    obtenerCliente: async (_, {id}, ctx) => {
      
      // Revisar si el cliente existe o no
      const cliente = await Cliente.findById(id);
      if(!cliente){
        throw new Error('Cliente no encontrado');
      }else{
        try{
          if(cliente.vendedor.toString() !== ctx.usuario.id){
            throw new Error('No tienes las credenciales');
          }else{
            return cliente;
          }
        }catch(err){
          console.log(err)
        }
      }

      // Quien lo creo puede verlo
    }
  },
  Mutation: {
    nuevoUsuario: async (_, {input}) => {
      console.log(input);

      const {email, password} = input;

      // Revisar si el usuario ya está registrado
      const existeUsuario = await Usuario.findOne({email});
      if(existeUsuario){
        throw new Error('El usuario ya está registrado');
      }
      
      // Hashear su password
      const salt = await bcryptjs.genSalt(10);
      input.password = await bcryptjs.hash(password, salt);

      // Guardarlo en la base de datos
      try{
        const usuario = new Usuario(input);
        usuario.save(); // Guarda en la base de datos
        return usuario;
      }catch(err){
        console.log(err);
      }

      return "Creando..."
    },
    
    autenticarUsuario: async (_, {input}) => {

      const {email, password} = input;
      // Si el usuario existe 
      const existeUsuario = await Usuario.findOne({email});
      if(!existeUsuario) {
        throw new Error('El usuario no existe');
      }

      // Revisar si el password es correcto
      const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password);
      if(!passwordCorrecto){
        throw new Error('El password es Incorrecto');
      }
      
      // Crear el token
      return{
        token: crearToken(existeUsuario, process.env.SECRETA, '24h')
      }
    },

    nuevoProducto: async (_, {input}) => {
      try{
        const producto = new Producto(input);

        // Almacenar en la base de datos
        const resultado = await producto.save();
        return resultado;
      }catch(err){
        console.log(err);
      }
    },

    actualizarProducto: async (_, {id, input}) => {
      
      // Revisar si el producto existe o no
      let producto = await Producto.findById(id);

      if(!producto){
        throw new Error('Producto no encontrado')
      }else{

        // guardarlo en la base de datos
        producto = await Producto.findOneAndUpdate({_id: id}, input, {new: true});
        return producto;
      }
    },

    eliminarProducto: async (_, {id}) => {

      // Revisar si el producto existe o no
      const producto = await Producto.findById(id);

      if(!producto){
        throw new Error('Producto no encontrado');
      }else{
        // eliminar
        await Producto.findOneAndDelete({_id: id});
        return "Producto eliminado";
      }
    },

    nuevoCliente: async (_, {input}, ctx) => {
      console.log(ctx);

      const {email} = input;

      // Verificar si el cliente ya está registrado
      const cliente = await Cliente.findOne({email});

      if(cliente){
        throw new Error('Ese cliente ya está registrado');
      }else{
        
        const nuevoCliente = new Cliente(input);
        // asignar el vendedor
        nuevoCliente.vendedor = ctx.usuario.id;
  
        // Guardarlo en la base de datos
        try{
          const resultado = await nuevoCliente.save();
          return resultado;
        }catch(err){
          console.log(err);
        }
      }  
    },

    actualizarCliente: async (_, {id, input}, ctx) => {

      // Verificar si existe o no 
      let cliente = await Cliente.findById(id);
      if(!cliente){
        throw new Error('El cliente no existe');
      }else{

        // Verificar si el vendedor es quien edita
        if(cliente.vendedor.toString() !== ctx.usuario.id){
          throw new Error('No tienes las credenciales')
        }else{
          
          // Guardar el cliente
          cliente = await Cliente.findOneAndUpdate({_id: id}, input, {new:true});
          return cliente;
        }
      }
    }
  }
}
module.exports = resolvers;
