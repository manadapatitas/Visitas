// ============================================================
// GOOGLE APPS SCRIPT - VERSIÓN INTEGRADA
// Sistema de Agendamiento + PWA Veterinario
// Manada Patitas
// ============================================================
// INSTRUCCIONES DE USO:
// 1. Abre tu Google Apps Script (el mismo que ya tienes)
// 2. REEMPLAZA TODO el contenido con este código
// 3. Guarda (Ctrl+S)
// 4. Ejecuta setupSheets() UNA VEZ para crear las hojas nuevas
// 5. Despliega como Web App (Implementar > Nueva implementación)
//    - Tipo: Aplicación web
//    - Ejecutar como: Yo
//    - Quién puede acceder: Cualquier persona
// 6. Copia la URL y pégala en AMBOS archivos HTML
// ============================================================

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// ============================================================
// SETUP: Crear hojas necesarias (ejecutar UNA sola vez)
// ============================================================
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const hojas = [
    { nombre: 'Citas',        encabezados: ['id','timestamp','ownerName','petName','phone','address','comuna','date','time','reason','clientEmail','accessCode','status','calendarEventId'] },
    { nombre: 'Configuracion',encabezados: ['clave','valor'] },
    { nombre: 'Clientes_PWA', encabezados: ['id','clienteId','rut','nombreDueno','telefono','nombreMascota','especie','raza','edad','puntos','canjes','fechaCreacion'] },
    { nombre: 'Visitas_PWA',  encabezados: ['id','clienteId','petName','ownerName','phone','fecha','motivo','veterinario','observaciones','agendaId','fechaRegistro'] },
    { nombre: 'Diagnosticos_PWA', encabezados: ['id','clienteId','petName','ownerName','fecha','diagnostico','notas','veterinario','agendaId','fechaRegistro'] },
    { nombre: 'Farmacos_PWA', encabezados: ['id','clienteId','petName','ownerName','fecha','farmaco','dosis','via','duracion','veterinario','agendaId','fechaRegistro'] },
    { nombre: 'Evoluciones_PWA', encabezados: ['id','clienteId','petName','ownerName','fecha','descripcion','recomendaciones','veterinario','agendaId','fechaRegistro'] },
    { nombre: 'Compras_PWA',  encabezados: ['id','clienteId','petName','ownerName','fecha','tipo','descripcion','monto','agendaId','fechaRegistro'] },
  ];
  
  hojas.forEach(({ nombre, encabezados }) => {
    let hoja = ss.getSheetByName(nombre);
    if (!hoja) {
      hoja = ss.insertSheet(nombre);
      hoja.appendRow(encabezados);
      // Formato de encabezados
      const header = hoja.getRange(1, 1, 1, encabezados.length);
      header.setFontWeight('bold');
      header.setBackground('#2E75B6');
      header.setFontColor('#FFFFFF');
      Logger.log(`✅ Hoja creada: ${nombre}`);
    } else {
      Logger.log(`⚠️  Hoja ya existe: ${nombre}`);
    }
  });
  
  Logger.log('✅ Setup completado');
}

// ============================================================
// UTILIDADES
// ============================================================
function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]) : ''; });
    return obj;
  });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// ENTRY POINT GET
// ============================================================
function doGet(e) {
  const action = e.parameter.action || 'getAll';
  
  try {
    if (action === 'getAll') return getAllAppointments();
    if (action === 'getConfig') return getConfig();
    if (action === 'getPWAData') return getPWAData(e.parameter.tipo);
    if (action === 'getHistorial') return getHistorialMascota(e.parameter.petName, e.parameter.ownerName);
    
    return jsonResponse({ error: 'Acción no reconocida: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

// ============================================================
// ENTRY POINT POST
// ============================================================
function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ error: 'JSON inválido', details: err.toString() });
  }
  
  const action = body.action;
  
  try {
    if (action === 'save')            return saveAppointment(body.appointment);
    if (action === 'update')          return updateAppointment(body.appointment);
    if (action === 'delete')          return deleteAppointment(body.id);
    if (action === 'saveConfig')      return saveConfig(body.config);
    if (action === 'savePWAData')     return savePWAData(body.tipo, body.data);
    if (action === 'savePWARecord')   return savePWARecord(body.tipo, body.record);
    if (action === 'updatePuntos')    return updatePuntos(body.clienteId, body.puntos);
    
    return jsonResponse({ error: 'Acción no reconocida: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

// ============================================================
// AGENDAMIENTO: LEER TODAS LAS CITAS
// ============================================================
function getAllAppointments() {
  const sheet = getSheet('Citas');
  if (!sheet) return jsonResponse({ appointments: [], error: 'Hoja Citas no encontrada' });
  
  const appointments = sheetToObjects(sheet).map(row => ({
    id: row.id,
    timestamp: row.timestamp,
    ownerName: row.ownerName,
    petName: row.petName,
    phone: row.phone,
    address: row.address,
    comuna: row.comuna,
    date: row.date,
    time: row.time,
    reason: row.reason,
    clientEmail: row.clientEmail,
    accessCode: row.accessCode,
    status: row.status || 'Pendiente',
    calendarEventId: row.calendarEventId
  }));
  
  return jsonResponse({ appointments });
}

// ============================================================
// AGENDAMIENTO: GUARDAR CITA
// ============================================================
function saveAppointment(appt) {
  const sheet = getSheet('Citas');
  if (!sheet) return jsonResponse({ success: false, error: 'Hoja Citas no encontrada' });
  
  sheet.appendRow([
    appt.id,
    appt.timestamp || new Date().toISOString(),
    appt.ownerName || '',
    appt.petName || '',
    appt.phone || '',
    appt.address || '',
    appt.comuna || '',
    appt.date || '',
    appt.time || '',
    appt.reason || '',
    appt.clientEmail || '',
    appt.accessCode || '',
    appt.status || 'Pendiente',
    appt.calendarEventId || ''
  ]);
  
  return jsonResponse({ success: true });
}

// ============================================================
// AGENDAMIENTO: ACTUALIZAR CITA (status, calendarEventId, etc.)
// ============================================================
function updateAppointment(appt) {
  const sheet = getSheet('Citas');
  if (!sheet) return jsonResponse({ success: false, error: 'Hoja Citas no encontrada' });
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(appt.id)) {
      // Actualizar solo los campos enviados
      Object.keys(appt).forEach(key => {
        const col = headers.indexOf(key);
        if (col >= 0 && key !== 'id') {
          sheet.getRange(i + 1, col + 1).setValue(appt[key]);
        }
      });
      return jsonResponse({ success: true });
    }
  }
  
  return jsonResponse({ success: false, error: 'Cita no encontrada: ' + appt.id });
}

// ============================================================
// AGENDAMIENTO: ELIMINAR CITA
// ============================================================
function deleteAppointment(id) {
  const sheet = getSheet('Citas');
  if (!sheet) return jsonResponse({ success: false });
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true });
    }
  }
  
  return jsonResponse({ success: false, error: 'Cita no encontrada' });
}

// ============================================================
// CONFIGURACIÓN
// ============================================================
function getConfig() {
  const sheet = getSheet('Configuracion');
  if (!sheet) return jsonResponse({});
  
  const rows = sheetToObjects(sheet);
  const config = {};
  rows.forEach(row => {
    if (row.clave) {
      try { config[row.clave] = JSON.parse(row.valor); }
      catch { config[row.clave] = row.valor; }
    }
  });
  
  return jsonResponse(config);
}

function saveConfig(config) {
  const sheet = getSheet('Configuracion');
  if (!sheet) return jsonResponse({ success: false });
  
  // Limpiar y reescribir
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
  
  Object.keys(config).forEach(key => {
    const val = typeof config[key] === 'object' ? JSON.stringify(config[key]) : String(config[key]);
    sheet.appendRow([key, val]);
  });
  
  return jsonResponse({ success: true });
}

// ============================================================
// PWA: GUARDAR/LEER DATOS CLÍNICOS COMPLETOS
// (Para sincronización masiva)
// ============================================================
function getPWAData(tipo) {
  const nombres = {
    clientes:     'Clientes_PWA',
    visitas:      'Visitas_PWA',
    diagnosticos: 'Diagnosticos_PWA',
    farmacos:     'Farmacos_PWA',
    evoluciones:  'Evoluciones_PWA',
    compras:      'Compras_PWA'
  };
  
  const nombreHoja = nombres[tipo];
  if (!nombreHoja) return jsonResponse({ error: 'Tipo inválido: ' + tipo, data: [] });
  
  const sheet = getSheet(nombreHoja);
  if (!sheet) return jsonResponse({ error: 'Hoja no encontrada: ' + nombreHoja, data: [] });
  
  const data = sheetToObjects(sheet).map(row => {
    const obj = {};
    Object.keys(row).forEach(k => {
      // Convertir números donde corresponda
      if (['puntos','canjes','monto'].includes(k)) {
        obj[k] = Number(row[k]) || 0;
      } else {
        obj[k] = row[k];
      }
    });
    return obj;
  });
  
  return jsonResponse({ data });
}

function savePWAData(tipo, dataArray) {
  const nombres = {
    clientes:     'Clientes_PWA',
    visitas:      'Visitas_PWA',
    diagnosticos: 'Diagnosticos_PWA',
    farmacos:     'Farmacos_PWA',
    evoluciones:  'Evoluciones_PWA',
    compras:      'Compras_PWA'
  };
  
  const nombreHoja = nombres[tipo];
  if (!nombreHoja) return jsonResponse({ success: false, error: 'Tipo inválido' });
  
  const sheet = getSheet(nombreHoja);
  if (!sheet) return jsonResponse({ success: false, error: 'Hoja no encontrada' });
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Limpiar datos existentes (preservar encabezados)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
  
  // Insertar todos los registros
  if (dataArray && dataArray.length > 0) {
    const rows = dataArray.map(item =>
      headers.map(h => item[h] !== undefined ? item[h] : '')
    );
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  
  return jsonResponse({ success: true, count: (dataArray || []).length });
}

// ============================================================
// PWA: GUARDAR UN SOLO REGISTRO (más eficiente para agregar)
// ============================================================
function savePWARecord(tipo, record) {
  const nombres = {
    clientes:     'Clientes_PWA',
    visitas:      'Visitas_PWA',
    diagnosticos: 'Diagnosticos_PWA',
    farmacos:     'Farmacos_PWA',
    evoluciones:  'Evoluciones_PWA',
    compras:      'Compras_PWA'
  };
  
  const nombreHoja = nombres[tipo];
  if (!nombreHoja) return jsonResponse({ success: false, error: 'Tipo inválido' });
  
  const sheet = getSheet(nombreHoja);
  if (!sheet) return jsonResponse({ success: false, error: 'Hoja no encontrada' });
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Buscar si ya existe (por id) para actualizar
  if (record.id) {
    const data = sheet.getDataRange().getValues();
    const idCol = headers.indexOf('id');
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(record.id)) {
        // Actualizar fila existente
        const row = headers.map(h => record[h] !== undefined ? record[h] : '');
        sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
        return jsonResponse({ success: true, action: 'updated' });
      }
    }
  }
  
  // Agregar nueva fila
  record.fechaRegistro = record.fechaRegistro || new Date().toISOString();
  const row = headers.map(h => record[h] !== undefined ? record[h] : '');
  sheet.appendRow(row);
  
  return jsonResponse({ success: true, action: 'inserted' });
}

// ============================================================
// PWA: ACTUALIZAR PUNTOS DE UN CLIENTE
// ============================================================
function updatePuntos(clienteId, puntos) {
  const sheet = getSheet('Clientes_PWA');
  if (!sheet) return jsonResponse({ success: false });
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('clienteId');
  const puntosCol = headers.indexOf('puntos');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(clienteId)) {
      sheet.getRange(i + 1, puntosCol + 1).setValue(puntos);
      return jsonResponse({ success: true });
    }
  }
  
  return jsonResponse({ success: false, error: 'Cliente no encontrado' });
}

// ============================================================
// PWA: HISTORIAL COMPLETO DE UNA MASCOTA
// ============================================================
function getHistorialMascota(petName, ownerName) {
  const hojas = ['Visitas_PWA','Diagnosticos_PWA','Farmacos_PWA','Evoluciones_PWA','Compras_PWA'];
  const result = {};
  
  hojas.forEach(nombre => {
    const sheet = getSheet(nombre);
    if (!sheet) { result[nombre] = []; return; }
    
    const data = sheetToObjects(sheet).filter(row =>
      row.petName === petName || row.ownerName === ownerName
    );
    result[nombre.replace('_PWA','')] = data;
  });
  
  return jsonResponse(result);
}

// ============================================================
// GOOGLE CALENDAR (ya existente - se mantiene igual)
// ============================================================
function createCalendarEvent(appt) {
  try {
    const calendar = CalendarApp.getDefaultCalendar();
    const startDate = new Date(`${appt.date}T${appt.time || '09:00'}:00`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    
    const event = calendar.createEvent(
      `🐾 Visita: ${appt.petName} (${appt.ownerName})`,
      startDate,
      endDate,
      {
        description: `Mascota: ${appt.petName}\nDueño: ${appt.ownerName}\nTeléfono: ${appt.phone}\nDirección: ${appt.address}, ${appt.comuna}\nMotivo: ${appt.reason || 'No especificado'}\nCódigo: ${appt.accessCode}`,
        location: `${appt.address}, ${appt.comuna}`
      }
    );
    
    return event.getId();
  } catch (e) {
    Logger.log('Error Calendar: ' + e);
    return null;
  }
}
