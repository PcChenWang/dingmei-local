// E:\project\dingmei\backend\server.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 讀取/寫入 DB
function readDB() {
  const filePath = path.join(__dirname, 'data', 'db.json');
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}
function writeDB(jsonData) {
  const filePath = path.join(__dirname, 'data', 'db.json');
  fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
}
// 讀取分類
function readCategories() {
  const filePath = path.join(__dirname, 'data', 'categories.json');
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}
// 讀取 storeContact.json
function readStoreContact() {
  const filePath = path.join(__dirname, 'data', 'storeContact.json');
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

// 測試
app.get('/', (req, res) => {
  res.send('定美洗衣店後端運作中...');
});

/* ========== 0. 登入/註冊/忘記密碼 (範例) ========== */

// 登入 (若你已有實作可保留)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.username===username && u.password===password);
  if(!user) {
    return res.json({ success:false, message:'帳號或密碼錯誤' });
  }
  // 回傳 role
  return res.json({ success:true, userId:user.id, role:user.role });
});

// 註冊
app.post('/api/register', (req, res) => {
  const { username, password, confirmPassword, lineId } = req.body;
  if(!username || !password || !confirmPassword){
    return res.json({ success:false, message:'欄位不足' });
  }
  if(password!==confirmPassword){
    return res.json({ success:false, message:'密碼不一致' });
  }
  const db = readDB();
  // 檢查重複
  const exist= db.users.find(u => u.username===username);
  if(exist) {
    return res.json({ success:false, message:'帳號已被註冊' });
  }
  // 新增
  let newId;
  do {
    newId= Math.floor(100000 + Math.random()*900000);
  } while(db.users.find(u=>u.id===newId));

  db.users.push({
    id:newId,
    username,
    password,
    role:'customer',
    lineId: lineId||'',
    phone:''
  });
  writeDB(db);
  return res.json({ success:true, message:'註冊成功' });
});

// 忘記密碼 (範例)
app.post('/api/forgot-password',(req,res)=>{
  const { username }= req.body;
  const db= readDB();
  const user= db.users.find(u=>u.username===username);
  if(!user){
    return res.json({ success:false, message:'找不到此帳號' });
  }
  // 這裡僅範例
  return res.json({ success:true, message:'已寄出重設密碼連結(範例)'});
});

/* ========== 1. 顧客資料 ========== */
app.get('/api/store/customers',(req,res)=>{
  const db= readDB();
  const customers= db.users
    .filter(u=>u.role==='customer')
    .map(c=>{
      const userOrders= db.orders.filter(o=>o.userId===c.id);
      const sendTimes= userOrders.length;
      const lastDate= userOrders.length? userOrders[userOrders.length-1].date:'';
      return {
        id: c.id,
        username: c.username,
        phone: c.phone||'',
        lineId: c.lineId||'',
        sendTimes,
        lastDate
      };
    });
  res.json({ success:true, data:customers });
});
app.post('/api/store/addCustomer',(req,res)=>{
  const { username, phone, lineId }= req.body;
  const db= readDB();
  if(!username){
    return res.json({ success:false, message:'顧客姓名(帳號)必填' });
  }
  const exist= db.users.find(u=>u.username===username);
  if(exist){
    return res.json({ success:false, message:'帳號已存在' });
  }
  let newId;
  do{
    newId= Math.floor(100000 + Math.random()*900000);
  } while(db.users.find(u=>u.id===newId));

  db.users.push({
    id:newId,
    username,
    password:'123456', //預設
    role:'customer',
    phone: phone||'',
    lineId: lineId||''
  });
  writeDB(db);
  res.json({ success:true, message:'新增顧客成功' });
});
app.post('/api/store/deleteCustomers',(req,res)=>{
  const { userIds }= req.body;
  const db= readDB();
  if(!Array.isArray(userIds)){
    return res.json({ success:false, message:'資料格式錯誤' });
  }
  db.users= db.users.filter(u=> !(u.role==='customer' && userIds.includes(u.id)));
  writeDB(db);
  res.json({ success:true, message:'刪除顧客成功' });
});

/* ========== 2. 分類 ========== */
app.get('/api/store/categories',(req,res)=>{
  try {
    const cat= readCategories();
    return res.json({ success:true, data:cat });
  } catch(err){
    return res.json({ success:false, message:'讀取分類檔失敗' });
  }
});

/* ========== 3. 建立訂單 (createOrder) ========== */
app.post('/api/store/createOrder',(req,res)=>{
  const { usernameOrPhone, isFrequent, items, extraFee }= req.body;
  const db= readDB();

  const customer= db.users.find(u=>u.role==='customer' &&
    (u.username===usernameOrPhone || u.phone===usernameOrPhone)
  );
  if(!customer){
    return res.json({ success:false, message:'找不到顧客(請先註冊或確認)' });
  }
  const newOrder={
    orderId: Date.now(),
    userId: customer.id,
    items: items||{},
    date: new Date().toISOString().slice(0,10),
    status:'washing',
    washedTime:'',
    isFrequent: isFrequent||false,
    extraFee: extraFee||0,
    totalPrice:0
  };

  let total=0;
  const priceTable= newOrder.isFrequent? db.prices.frequent: db.prices.normal;
  for(let k in newOrder.items){
    const qty= newOrder.items[k];
    if(priceTable[k]){
      total+= priceTable[k]* qty;
    }
  }
  newOrder.totalPrice= total + newOrder.extraFee;

  db.orders.push(newOrder);
  writeDB(db);
  res.json({ success:true, order:newOrder });
});

/* ========== 4. 洗衣進度 (washing) ========== */
app.get('/api/store/washing',(req,res)=>{
  const db= readDB();
  const washing= db.orders.filter(o=>o.status==='washing');
  const result= washing.map(o=>{
    const user= db.users.find(u=>u.id===o.userId);
    let itemsDesc='';
    for(let k in o.items){
      if(o.items[k]>0){
        itemsDesc+= `${k}${o.items[k]}件 `;
      }
    }
    return {
      orderId:o.orderId,
      customerName: user?user.username:'不明顧客',
      phone:user? user.phone:'',
      lineId:user? user.lineId:'',
      date:o.date,
      itemsDesc: itemsDesc.trim()
    };
  });
  res.json({ success:true, data: result });
});
app.post('/api/store/finishWashing',(req,res)=>{
  const { orderIds }= req.body;
  const db= readDB();
  const now= new Date().toISOString();
  orderIds.forEach(oid=>{
    const idx= db.orders.findIndex(o=>o.orderId===oid);
    if(idx!==-1 && db.orders[idx].status==='washing'){
      db.orders[idx].status='washed';
      db.orders[idx].washedTime= now;
    }
  });
  writeDB(db);
  res.json({ success:true, message:'完成清洗成功' });
});

/* ========== 5. 完成清洗 (unpicked)->picked ========== */
app.get('/api/store/unpicked',(req,res)=>{
  const db= readDB();
  const unpicked= db.orders.filter(o=>o.status==='washed');
  const result= unpicked.map(o=>{
    const user= db.users.find(u=>u.id===o.userId);
    let itemsDesc='';
    for(let k in o.items){
      if(o.items[k]>0){
        itemsDesc+= `${k}${o.items[k]}件 `;
      }
    }
    return {
      orderId:o.orderId,
      customerName:user?user.username:'不明顧客',
      phone: user? user.phone:'',
      lineId:user? user.lineId:'',
      date: o.date,
      washedTime:o.washedTime||'',
      itemsDesc: itemsDesc.trim()
    };
  });
  res.json({ success:true, data:result });
});
app.post('/api/store/completePickup',(req,res)=>{
  const { orderIds }= req.body;
  const db= readDB();
  orderIds.forEach(oid=>{
    const idx= db.orders.findIndex(o=>o.orderId===oid);
    if(idx!==-1 && db.orders[idx].status==='washed'){
      db.orders[idx].status='picked';
    }
  });
  writeDB(db);
  return res.json({ success:true, message:'已完成領取' });
});

/* ========== 6. 歷史紀錄 (history) ========== */
app.get('/api/store/history',(req,res)=>{
  const db= readDB();
  const picked= db.orders.filter(o=>o.status==='picked');
  // 此處回傳 totalPrice 方便前端顯示
  const result= picked.map(o=>{
    const user= db.users.find(u=>u.id===o.userId);
    let itemsDesc='';
    for(let k in o.items){
      if(o.items[k]>0){
        itemsDesc+= `${k}${o.items[k]}件 `;
      }
    }
    return {
      orderId:o.orderId,
      customerName: user? user.username:'不明顧客',
      phone: user? user.phone:'',
      lineId: user? user.lineId:'',
      date: o.date,               // 送洗時間
      totalPrice:o.totalPrice||0, // 將 totalPrice 帶給前端
      washedTime:o.washedTime||'',
      itemsDesc: itemsDesc.trim()
    };
  });
  res.json({ success:true, data:result });
});

/* ========== 7. 價格設定 (prices) ========== */
app.get('/api/store/prices',(req,res)=>{
  const db= readDB();
  res.json({ success:true, data: db.prices });
});
app.post('/api/store/prices',(req,res)=>{
  const { type, key, value }= req.body;
  const db= readDB();
  if(!db.prices[type]){
    return res.json({ success:false, message:'價格類型不存在' });
  }
  db.prices[type][key]= value;
  writeDB(db);
  res.json({ success:true, message:'價格已更新' });
});

/* ========== 8. 營業時間 (storeTime) ========== */
app.get('/api/store/time',(req,res)=>{
  const db= readDB();
  res.json({ success:true, data: db.storeTime });
});
app.post('/api/store/time',(req,res)=>{
  const { weekdays, special }= req.body;
  const db= readDB();
  db.storeTime.weekdays= weekdays;
  db.storeTime.special= special;
  writeDB(db);
  res.json({ success:true, message:'營業時間已更新' });
});

// 只展示 completePickup 修改
app.post('/api/store/completePickup',(req,res)=>{
  const { orderIds }= req.body;
  const db= readDB();
  orderIds.forEach(oid=>{
    const idx= db.orders.findIndex(o=>o.orderId===oid);
    if(idx!==-1 && db.orders[idx].status==='washed'){
      db.orders[idx].status='picked';
      // 新增 pickTime 紀錄領取時間(ISO8601)
      db.orders[idx].pickTime= new Date().toISOString();
    }
  });
  writeDB(db);
  return res.json({ success:true, message:'已完成領取' });
});

// 店家聯繫資訊
app.get('/api/store/contact', (req, res) => {
  try {
    const info = readStoreContact();
    res.json({ success:true, data: info });
  } catch (err) {
    res.json({ success:false, message:'無法讀取 storeContact.json' });
  }
});

// 顧客端：取得顧客資料
app.get('/api/customer/:userId', (req, res)=>{
  // userId 為數字
  const uid = parseInt(req.params.userId);
  const db = readDB();
  const user = db.users.find(u => u.id===uid && u.role==='customer');
  if(!user){
    return res.json({ success:false, message:'找不到此顧客' });
  }

  // 回傳顧客資訊 (假設有 user.registeredDate 註冊日期)
  // 你可以在 db.json 中的 user 加上一個 registeredDate 屬性
  const result = {
    success:true,
    user:{
      id: user.id,
      username: user.username,
      phone: user.phone||'',
      lineId: user.lineId||'',
      registeredDate: user.registeredDate||'2025/01/23' // 你可自行存
    }
  };
  res.json(result);
});

// 顧客端：修改基本資料
app.post('/api/customer/update', (req, res)=>{
  const { userId, phone, lineId }= req.body;
  const db= readDB();
  const idx= db.users.findIndex(u => u.id===userId && u.role==='customer');
  if(idx===-1){
    return res.json({ success:false, message:'找不到顧客' });
  }
  if(phone!==undefined) db.users[idx].phone= phone;
  if(lineId!==undefined) db.users[idx].lineId= lineId;
  writeDB(db);
  res.json({ success:true, message:'顧客資料已更新' });
});

// 顧客端：取得顧客的訂單(尚未取回)
app.get('/api/customer/:userId/ordersInProgress', (req,res)=>{
  const uid= parseInt(req.params.userId);
  const db= readDB();
  const user = db.users.find(u=>u.id===uid && u.role==='customer');
  if(!user) return res.json({ success:false, message:'找不到顧客' });
  // 取 status != 'picked' 的訂單
  const myOrders= db.orders.filter(o=> o.userId===uid && o.status!=='picked');
  // 整理
  const result= myOrders.map(o=>{
    let itemsDesc='';
    for(let k in o.items){
      if(o.items[k]>0){
        itemsDesc+=`${k}${o.items[k]}件 `;
      }
    }
    // 是否完成 => 'washed' 就打勾, 'washing' 打叉
    const isFinish= (o.status==='washed')?'✔':'✘';
    return {
      orderId: o.orderId,
      date: o.date,         // 送洗時間
      itemsDesc: itemsDesc.trim(),
      price: o.totalPrice||0,
      finishSymbol: isFinish
    };
  });
  res.json({ success:true, data: result });
});

// 顧客端：取得顧客的歷史訂單(已取回)
app.get('/api/customer/:userId/ordersHistory',(req,res)=>{
  const uid= parseInt(req.params.userId);
  const db= readDB();
  const user= db.users.find(u=>u.id===uid && u.role==='customer');
  if(!user) return res.json({ success:false, message:'找不到顧客' });
  const myOrders= db.orders.filter(o=> o.userId===uid && o.status==='picked');
  const result= myOrders.map(o=>{
    let itemsDesc='';
    for(let k in o.items){
      if(o.items[k]>0){
        itemsDesc+=`${k}${o.items[k]}件 `;
      }
    }
    // 取回時間 = 'picked'時暫存 washedTime? or pickTime?
    // 你可在 completePickup 時加個 pickTime
    return {
      orderId: o.orderId,
      date: o.date,
      itemsDesc: itemsDesc.trim(),
      price: o.totalPrice||0,
      pickupTime: o.pickTime || ''
    };
  });
  res.json({ success:true, data:result });
});


/* ========== 啟動 ========== */
app.listen(PORT, ()=>{
  console.log(`Server running on http://localhost:${PORT}`);
});
