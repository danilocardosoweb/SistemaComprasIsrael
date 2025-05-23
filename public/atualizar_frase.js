// Script para atualizar a frase no rodapé
document.addEventListener('DOMContentLoaded', () => {
  // Função para substituir a frase
  const substituirFrase = () => {
    // Encontrar todos os elementos de texto na página
    const elementos = document.querySelectorAll('p');
    
    // Percorrer todos os elementos e substituir a frase
    elementos.forEach(elemento => {
      if (elemento.textContent === 'Facilitando o acesso aos produtos exclusivos.') {
        elemento.textContent = 'Mais que reservas, experiências que conectam propósito e exclusividade.';
        console.log('Frase substituída com sucesso!');
      }
    });
  };
  
  // Executar a substituição quando a página carregar
  substituirFrase();
  
  // Executar novamente após 1 segundo para garantir que todos os elementos foram carregados
  setTimeout(substituirFrase, 1000);
});
