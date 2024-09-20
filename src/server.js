const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios'); // ใช้ axios สำหรับดึงข้อมูลจาก API
const mqtt = require('mqtt');  // เพิ่ม mqtt

const app = express();
const server = http.createServer(app);

// ตั้งค่า WebSocket และ CORS ให้ถูกต้อง
const io = new Server(server, {
  // cors: {
  //   origin: "http://192.168.1.35:3000", 
  //   methods: ["GET", "POST"],
  //   allowedHeaders: ["Access-Control-Allow-Origin"],
  //   credentials: true
  // }
  cors: {
    origin: (origin, callback) => {
      // อนุญาตทุกที่ (ทุก IP) แทนการใช้ "*"
      callback(null, true);
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Access-Control-Allow-Origin"],
    credentials: true
  }
});


// เชื่อมต่อกับ MQTT broker
const mqttClient = mqtt.connect('mqtt://good-moose.com', {
  port: 1883, // Adjust the port if necessary
  username: 'yourUsername', // ใส่ username ถ้ามี
  password: 'yourPassword'  // ใส่ password ถ้ามี
});

// เมื่อเชื่อมต่อกับ MQTT broker สำเร็จ
mqttClient.on('connect', () => {
  console.log('Connected to MQTT Broker');
  
  // สมัครสมาชิกกับ topic MQTT ที่ต้องการ
  mqttClient.subscribe('/pap/001', (err) => {
    if (err) {
      console.error('Subscribe error:', err);
    }
  });
});

// เมื่อได้รับข้อความจาก MQTT broker
mqttClient.on('message', (topic, message) => {
  console.log(`Received message from ${topic}: ${message.toString()}`);
  
  // ส่งข้อมูล MQTT ไปยังทุก client ที่เชื่อมต่อผ่าน WebSocket
  io.emit('mqttData', { topic, message: message.toString() });
});

// ฟัง event จาก WebSocket client ที่ส่งข้อมูลมาแล้วส่งต่อไปยัง MQTT
io.on('connection', (socket) => {
  console.log('Mc_41 connected');
  
  // ทดสอบส่งข้อความเมื่อมีการเชื่อมต่อ
  socket.emit('testMessage', 'WebSocket connection established successfully.');

  // ฟัง event 'sendToMQTT' จาก client (React)
  socket.on('sendToMQTT', (data) => {
    const { topic, message } = data;
    console.log(`Received from client: ${message} for topic: ${topic}`);
    
    // ส่งข้อมูลไปยัง MQTT broker
    mqttClient.publish(topic, message, (error) => {
      if (error) {
        console.error('Publish error:', error);
      } else {
        console.log(`Message sent to MQTT topic ${topic}: ${message}`);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('Mc_41 disconnected');
  });
});

// ดึงข้อมูลจาก API ทุก 500ms แล้วส่งให้ client ผ่าน WebSocket
const fetchAlarmData = async () => {
  try {
    const response = await axios.get('https://api2-one-iota.vercel.app/api/alarm1');
    const data = response.data;
    console.log(data);
    io.emit('alarmData', data); 
  } catch (error) {
    console.error('Error fetching alarm data:', error.message);  
    io.emit('alarmDataError', { message: 'Error fetching data', details: error.message }); 
  }
};

// ดึงข้อมูลจาก API ทุก 500ms แล้วส่งให้ client ผ่าน WebSocket
const fetchAlarmData1 = async () => {
  try {
    const response = await axios.get('https://api2-one-iota.vercel.app/api/msg');
    const data = response.data;
    console.log(data);
    io.emit('alarmData1', data); 
  } catch (error) {
    console.error('Error fetching alarm data:', error.message); 
    io.emit('alarmDataError', { message: 'Error fetching data', details: error.message }); 
  }
};

// เรียก fetchAlarmData1 และ fetchAlarmData ทุก ๆ 200ms
setInterval(fetchAlarmData1, 400);
setInterval(fetchAlarmData, 400);

server.listen(10000, () => {
  console.log('Server is running on port 5000');
});
