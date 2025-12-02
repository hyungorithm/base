export const getPlayerImageUrl = (playerId: number) => {
    const style = 'miniavs';
  
    const params = new URLSearchParams({
      seed: playerId.toString(),
  
      // 1. [헤어스타일] 긴 머리, 양갈래(pigtails) 등을 제외하고 짧은 스타일만 허용
      hair: [
        'balndess',   
        'classic01',  
        'classic02',  
        'curly',      
        'elvis',      
        'slaughter',       
        'stylish',  
      ].join(','),
  
      // 2. [수염] 40% 확률로 콧수염 추가 (남성미 강조)
      mustacheProbability: '40',
  
      // 3. [볼터치] 0%로 설정 (여성스럽거나 너무 아기 같은 느낌 제거)
      blushesProbability: '0',
  
      // 5. [안경] 20% 확률 (선글라스나 안경 쓴 선수)
      glassesProbability: '20',
  
      // 6. [배경색] 파스텔톤 유지
      backgroundColor: 'b6e3f4,c0aede,d1d4f9',

      skinColor: 'ffcb7e,f5d0c5',
    });
  
    return `https://api.dicebear.com/9.x/${style}/svg?${params.toString()}`;
  };