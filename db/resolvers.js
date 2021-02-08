
const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const Pedido = require('../models/Pedido');

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
    },

    obtenerPedidos: async () => {
      try{
        const pedidos = await Pedido.find({});
        return pedidos;
      }catch(err){
        console.log(err);
      }
    },

    obtenerPedidosVendedor: async (_, {}, ctx) => {
      try{
        const pedidos = await Pedido.find({vendedor: ctx.usuario.id});
        return pedidos;
      }catch(err){
        console.log(err)
      }
    },

    obtenerPedido: async (_, {id}, ctx) => {

      // Si el pedido existe o no
      const pedido = await Pedido.findById(id);
      if(!pedido){
        throw new Error('Pedido no encontrado');
      }

      // Solo quien lo creo puede verlo
      if(pedido.vendedor.toString() !== ctx.usuario.id){
        throw new Error('No tienes las credenciales');
      }

      // retornar el resultado
      return pedido;
    },

    obtenerPedidosEstado: async(_, {estado}, ctx) => {
      const pedidos = await Pedido.find({vendedor: ctx.usuario.id, estado: estado});
      return pedidos;
    },
    
    mejoresClientes: async () => {
      const clientes = await Pedido.aggregate([
        {$match: {estado: "COMPLETADO"}},
        {$group: {
          _id: "$cliente",
          total: {$sum: '$total'}
        }},
        {
          $lookup: {
            from: 'clientes',
            localField: '_id',
            foreignField: '_id',
            as: 'cliente'
          }
        },
        {
          $sort: {total: -1}
        }
      ]);
      return clientes;
    },

    mejoresVendedores: async () => {
       const vendedores = await Pedido.aggregate([
        {$match: {estado: "COMPLETADO"}},
        {$group: {
          _id: "$vendedor",
          total: {$sum: '$total'}
        }},
        {
          $lookup: {
            from: 'usuarios',
            localField: '_id',
            foreignField: '_id',
            as: 'vendedor'
          }
        },
        {
          $limit: 3
        },  
        {
          $sort: {total: -1}
        }
      ]);
      return vendedores;
    },

    buscarProducto: async(_, {texto}) => {
      const productos = await Producto.find({$text: {$search: texto}})
      return productos;
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
    },

    eliminarCliente: async (_, {id}, ctx) => {

      // Verificar si existe o no 
      let cliente = await Cliente.findById(id);
      if(!cliente){
        throw new Error('El cliente no existe');
      }else{

        // Verificar si el vendedor es quien edita
        if(cliente.vendedor.toString() !== ctx.usuario.id){
          throw new Error('No tienes las credenciales')
        }else{
          
          // Eliminar el cliente
          await Cliente.findOneAndDelete({_id: id});
          return "Cliente eliminado";
        }
      }
    },

    nuevoPedido: async (_, {input}, ctx) => {

      const {cliente} = input

      // Verificar si el cliente existe o no
      let clienteExiste = await Cliente.findById(cliente);
      if(!clienteExiste){
        throw new Error('Ese cliente no existe');
      }

      // Verificar si el cliente es del vendedor
      if(clienteExiste.vendedor.toString() !== ctx.usuario.id){
        throw new Error('No tienes las credenciales');
      }else{
        // Revisar que el stock esté diponible
        for await (const articulo of input.pedido) {
          const {id} = articulo;

          const producto = await Producto.findById(id);

          if(articulo.cantidad > producto.existencia){
            throw new Error('El articulo ' + producto.nombre + ' excede la cantidad disponible');
          }else{
            // Restar la cantidad a lo diponible
            producto.existencia -= articulo.cantidad;
            await producto.save();
          }
        };

        // Crear un nuevo pedido
        const nuevoPedido = new Pedido(input);
        
        // Asignarle un vendedor
        nuevoPedido.vendedor = ctx.usuario.id;
  
        // Guardarlo en la base de datos
        const resultado = await nuevoPedido.save();
        return resultado;
      }
    },

    actualizarPedido: async(_, {id, input}, ctx) => {

      const {cliente} = input;

      // Verificar si el pedido existe 
      const exitePedido = await Pedido.findById(id);
      if(!exitePedido){
        throw new Error('El pedido no existe');
      }

      //Verificar si el cliente existe
      const existeCliente = await Cliente.findById(cliente); 
      if(!existeCliente){
        throw new Error('El cliente no existe');
      }

      // Verificar si el cliente y pedido pertence al vendedor
      if(existeCliente.vendedor.toString() !== ctx.usuario.id){
        throw new Error('No tienes las credenciales');
      }

      // Revisar el stock
      for await(const articulo of input.pedido){
        const {id} = articulo;

        const producto = await Producto.findById(id);

        if(articulo.cantidad > producto.existencia){
          throw new Error('El artículo ' + producto.nombre + ' excede la cantidad disponible');
        }else{
          producto.existencia -= articulo.cantidad;

          await producto.save();
        }
      }

      // Guardar el pedido
      const resultado = await Pedido.findOneAndUpdate({_id: id}, input, {new: true});
      return resultado;
    },

    eliminarPedido: async(_, {id}, ctx) => {

      // Verificar si el pedido existe o no
      const pedido = await Pedido.findById(id);
      if(!pedido){
        throw new Error('El pedido no existe')
      }

      // Verificar si el vendedor es quien lo intenta borrar
      if(pedido.vendedor.toString() !== ctx.usuario.id){
        throw new Error('No tienes las credenciales');
      }

      // Eliminar de la base de datos
      await Pedido.findByIdAndDelete({_id: id});
      return "Pedido eliminado";
    }
  }
}
module.exports = resolvers;
