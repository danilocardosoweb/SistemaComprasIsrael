// Script para verificar o problema com os comprovantes
console.log('Iniciando diagnóstico de comprovantes...');

// Simular o ambiente do navegador
global.File = class File {
  constructor(bits, name, options = {}) {
    this.name = name;
    this.size = bits.length;
    this.type = options.type || '';
  }
};

// Importar as variáveis de ambiente do .env
require('dotenv').config();

// Criar cliente Supabase
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não definidas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnosticarComprovantes() {
  try {
    // 1. Verificar se o bucket existe
    console.log('Verificando buckets disponíveis...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Erro ao listar buckets:', bucketsError);
      return;
    }
    
    console.log('Buckets disponíveis:', buckets.map(b => b.name));
    
    // 2. Verificar se há comprovantes no bucket
    const bucketName = buckets.find(b => b.name === 'comprovantes') ? 'comprovantes' : 'public';
    console.log(`Verificando arquivos no bucket "${bucketName}"...`);
    
    const { data: files, error: filesError } = await supabase.storage.from(bucketName).list();
    
    if (filesError) {
      console.error(`Erro ao listar arquivos do bucket ${bucketName}:`, filesError);
      return;
    }
    
    console.log(`Arquivos no bucket ${bucketName}:`, files.map(f => f.name));
    
    // 3. Verificar vendas com comprovantes
    console.log('Verificando vendas com comprovantes...');
    const { data: vendas, error: vendasError } = await supabase
      .from('vendas')
      .select('id, cliente_nome, comprovante_url')
      .not('comprovante_url', 'is', null);
    
    if (vendasError) {
      console.error('Erro ao consultar vendas com comprovantes:', vendasError);
      return;
    }
    
    console.log(`Encontradas ${vendas.length} vendas com comprovantes:`);
    vendas.forEach(v => {
      console.log(`- Venda ${v.id} (${v.cliente_nome}): ${v.comprovante_url}`);
    });
    
    // 4. Verificar uma venda específica
    if (process.argv[2]) {
      const vendaId = process.argv[2];
      console.log(`\nVerificando detalhes da venda ${vendaId}...`);
      
      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .select('*')
        .eq('id', vendaId)
        .single();
      
      if (vendaError) {
        console.error(`Erro ao consultar venda ${vendaId}:`, vendaError);
        return;
      }
      
      console.log('Detalhes da venda:');
      console.log(JSON.stringify(venda, null, 2));
      
      // Verificar se a URL do comprovante é acessível
      if (venda.comprovante_url) {
        console.log(`\nVerificando URL do comprovante: ${venda.comprovante_url}`);
        
        // Extrair o nome do arquivo da URL
        const urlParts = venda.comprovante_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        // Verificar se o arquivo existe no bucket
        const { data: fileExists, error: fileExistsError } = await supabase
          .storage
          .from(bucketName)
          .download(fileName);
        
        if (fileExistsError) {
          console.error(`Erro ao verificar arquivo ${fileName}:`, fileExistsError);
          console.log('A URL do comprovante pode estar incorreta ou o arquivo pode não existir mais.');
        } else {
          console.log(`Arquivo ${fileName} encontrado no bucket ${bucketName}.`);
        }
      } else {
        console.log('Esta venda não possui comprovante.');
      }
    }
    
  } catch (error) {
    console.error('Erro durante o diagnóstico:', error);
  }
}

diagnosticarComprovantes().then(() => {
  console.log('\nDiagnóstico concluído.');
});
