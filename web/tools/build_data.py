"""Genera web/explorer-data.js a partir de la hoja "Data" del Excel.

Uso:  pip install pandas openpyxl
      python web/tools/build_data.py v5_Hongos_DataSet_Rodrigo_Vidal.xlsx web/explorer-data.js
"""
import json, sys
import pandas as pd

cols=['Class por Nombre','cap-diameter','cap-shape Nombre','cap-color Nombre','stem-color Nombre','cap-surface Nombre','habitat Nombre','season Nombre','has-ring Nombre','does-bruise-or-bleed Nombre','stem-height','stem-width','Con tallo']
df=pd.read_excel(sys.argv[1],sheet_name='Data',usecols=cols)
dims={'shape':'cap-shape Nombre','capColor':'cap-color Nombre','stemColor':'stem-color Nombre','surface':'cap-surface Nombre','habitat':'habitat Nombre','season':'season Nombre','ring':'has-ring Nombre','bruise':'does-bruise-or-bleed Nombre'}
bins=[0,2,4,6,8,10,15,25,1000]; binlabels=['0–2','2–4','4–6','6–8','8–10','10–15','15–25','25+']
df['size']=pd.cut(df['cap-diameter'],bins=bins,labels=False,right=False)
cats={k:sorted(df[v].unique().tolist()) for k,v in dims.items()}
codes=pd.DataFrame({k:df[v].map({c:i for i,c in enumerate(cats[k])}) for k,v in dims.items()})
codes['size']=df['size'].astype(int)
codes['tox']=(df['Class por Nombre']=='Venenoso').astype(int)
keys=list(dims)+['size']
g=codes.groupby(keys)['tox'].agg(['count','sum']).reset_index()
rows=g[keys+['count','sum']].values.tolist()
print('combos',len(rows))
# scatter sample
s=df[(df['Con tallo']=='Sí')&(df['cap-diameter']<25)].sample(2500,random_state=7)
scatter=[[round(a,2),round(b,2),int(c=='Venenoso')] for a,b,c in zip(s['cap-diameter'],s['stem-width'],s['Class por Nombre'])]
out={'dims':keys,'cats':{**cats,'size':binlabels},'rows':rows,'scatter':scatter,'total':len(df),'toxic':int(codes.tox.sum())}
open(sys.argv[2],'w').write('window.EXPLORER='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';')
