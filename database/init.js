const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL e SUPABASE_KEY devem estar definidos no .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function initDatabase() {
  try {
    // Testar conexão
    const { data, error } = await supabase.from('usuarios').select('count').limit(1);
    
    if (error) {
      console.error('❌ Erro ao conectar com Supabase:', error.message);
      console.log('💡 Crie as tabelas no SQL Editor do Supabase');
      return;
    }
    
    console.log('✅ Conectado ao Supabase com sucesso!');
  } catch (error) {
    console.error('❌ Erro fatal ao inicializar banco:', error.message);
  }
}

// Alias para compatibilidade com código existente
const db = supabase;

module.exports = { db, supabase, initDatabase };
