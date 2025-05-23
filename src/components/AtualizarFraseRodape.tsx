import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const AtualizarFraseRodape = () => {
  const { toast } = useToast();
  
  useEffect(() => {
    const atualizarFrase = async () => {
      try {
        // Atualizar a frase no banco de dados
        const { error } = await supabase
          .from('site_textos')
          .update({
            pagina_inicial_descricao: 'Mais que reservas, experiências que conectam propósito e exclusividade.',
            footer_descricao: 'Mais que reservas, experiências que conectam propósito e exclusividade.'
          })
          .is('id', null);
        
        if (error) {
          console.error('Erro ao atualizar a frase:', error);
          toast({
            title: "Erro ao atualizar a frase",
            description: error.message,
            variant: "destructive",
          });
        } else {
          console.log('Frase atualizada com sucesso!');
          toast({
            title: "Frase atualizada",
            description: "A frase do rodapé foi atualizada com sucesso!",
          });
          
          // Recarregar a página após 2 segundos
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } catch (error: any) {
        console.error('Erro na execução:', error);
        toast({
          title: "Erro na execução",
          description: error.message,
          variant: "destructive",
        });
      }
    };
    
    atualizarFrase();
  }, []);
  
  return null; // Este componente não renderiza nada
};

export default AtualizarFraseRodape;
