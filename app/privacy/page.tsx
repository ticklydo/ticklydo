"use client";
import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();
  const s = {color:"rgba(200,190,255,0.8)",fontFamily:"sans-serif",lineHeight:"1.8",marginBottom:"24px"};
  const h = {color:"#f0eeff",fontFamily:"sans-serif",marginTop:"32px",marginBottom:"8px",fontSize:"17px"};
  const link = {color:"#c084fc"};
  return (
    <div style={{minHeight:"100vh",background:"#07070f",padding:"40px 20px"}}>
      <div style={{maxWidth:"700px",margin:"0 auto"}}>
        <button onClick={() => router.push("/")} style={{background:"none",border:"none",color:"#c084fc",cursor:"pointer",fontFamily:"sans-serif",marginBottom:"24px"}}>← Späť</button>
        <h1 style={{color:"#f0eeff",fontFamily:"sans-serif",fontSize:"26px",marginBottom:"4px"}}>Podmienky & GDPR</h1>
        <p style={{color:"rgba(200,190,255,0.4)",fontFamily:"sans-serif",fontSize:"13px",marginBottom:"32px"}}>Platné od: máj 2026 · ticklydo.com</p>

        <h2 style={h}>Kto prevádzkuje túto aplikáciu</h2>
        <p style={s}>TicklyDo je aplikácia na správu taskov, nápady a kalendár prevádzkovaná na Slovensku. Pre všetky otázky vrátane ochrany osobných údajov nás kontaktuj na <a href="mailto:support@ticklydo.com" style={link}>support@ticklydo.com</a>.</p>

        <h2 style={h}>Ako funguje aplikácia</h2>
        <p style={s}>TicklyDo ti umožňuje vytvárať a spravovať tasky, zapisovať nápady a sledovať kalendár na jednom mieste. Po prihlásení sú tvoje dáta uložené v cloudovej databáze a dostupné z akéhokoľvek zariadenia. Obsah ktorý vytvoríš zostáva súkromný a viditeľný len tebe.</p>

        <h2 style={h}>Prihlásenie a registrácia</h2>
        <p style={s}>Môžeš sa zaregistrovať emailom a heslom alebo cez Google účet. Pri registrácii emailom nikdy neukladáme heslo v čitateľnej podobe. Heslo je uložené výlučne ako nečitateľný hash v Google Firebase Authentication.</p>

        <h2 style={h}>Aké údaje spracúvame</h2>
        <p style={s}>Pri registrácii spracúvame email, meno a heslo vo forme hash-u. Pri prihlásení cez Google získavame email, meno a profilovú fotku. Počas používania aplikácie ukladáme obsah ktorý vytvoríš, teda tasky, nápady a kalendárne záznamy. Z technických dôvodov zaznamenávame aj IP adresu a typ zariadenia.</p>

        <h2 style={h}>Na aký účel a na akom právnom základe</h2>
        <p style={s}>Tvoje údaje spracúvame výlučne za účelom poskytovania služby TicklyDo. Právnym základom je plnenie zmluvy podľa článku 6 odseku 1 písmena b) nariadenia GDPR a súhlas podľa článku 6 odseku 1 písmena a) GDPR udelený pri registrácii.</p>

        <h2 style={h}>Platná legislatíva</h2>
        <p style={s}>Spracúvanie osobných údajov sa riadi nasledovnými predpismi:</p>
        <ul style={{...s, paddingLeft:"20px"}}>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Nariadenie GDPR</strong> je Nariadenie Európskeho parlamentu a Rady (EÚ) 2016/679 o ochrane fyzických osôb pri spracúvaní osobných údajov.</li>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Zákon č. 18/2018 Z. z.</strong> je Zákon o ochrane osobných údajov platný v Slovenskej republike.</li>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Zákon č. 452/2021 Z. z.</strong> upravuje elektronické komunikácie vrátane cookies.</li>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Smernica ePrivacy</strong> je Smernica 2002/58/ES o spracúvaní osobných údajov v sektore elektronických komunikácií.</li>
        </ul>
        <p style={s}>Dozorným orgánom pre ochranu osobných údajov v SR je <a href="https://dataprotection.gov.sk" target="_blank" style={link}>Úrad na ochranu osobných údajov SR</a>.</p>

        <h2 style={h}>Kde sú dáta uložené</h2>
        <p style={s}>Tvoje dáta sú uložené v Google Firebase, čo je cloudová databáza spoločnosti Google LLC. Dáta môžu byť uložené na serveroch v EÚ alebo USA. Google LLC je certifikovaná podľa EU-US Data Privacy Framework. Viac informácií nájdeš na <a href="https://policies.google.com/privacy" target="_blank" style={link}>policies.google.com/privacy</a>.</p>

        <h2 style={h}>Cookies a prihlásenie</h2>
        <p style={s}>Na prihlasovanie používame cookies ktoré zabezpečujú zachovanie relácie v súlade so zákonom č. 452/2021 Z. z. Nepoužívame reklamné ani sledovacie cookies tretích strán.</p>

        <h2 style={h}>Ako dlho údaje uchovávame</h2>
        <p style={s}>Tvoje údaje uchovávame po dobu existencie tvojho účtu. Po vymazaní účtu budú dáta odstránené do 30 dní v súlade s článkom 17 GDPR, ktorý upravuje právo na výmaz.</p>

        <h2 style={h}>Komu môžu byť údaje sprístupnené</h2>
        <p style={s}>Tvoje údaje nepredávame ani neposkytujeme tretím stranám na marketingové účely. Technický prístup k nim má Google Firebase ako sprostredkovateľ podľa článku 28 GDPR, ktorý ich spracúva výlučne v našom mene na základe zmluvy o spracúvaní údajov.</p>

        <h2 style={h}>Prenos mimo EÚ</h2>
        <p style={s}>Dáta môžu byť spracúvané na serveroch Google v USA. Prenos je zabezpečený v súlade s článkom 46 GDPR prostredníctvom štandardných zmluvných doložiek a certifikácie EU-US Data Privacy Framework. Viac informácií nájdeš na <a href="https://policies.google.com/privacy" target="_blank" style={link}>policies.google.com/privacy</a>.</p>

        <h2 style={h}>Tvoje práva</h2>
        <p style={s}>Podľa GDPR máš nasledovné práva:</p>
        <ul style={{...s, paddingLeft:"20px"}}>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Právo na prístup</strong> podľa článku 15 znamená že môžeš kedykoľvek zistiť aké údaje o tebe spracúvame.</li>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Právo na opravu</strong> podľa článku 16 ti umožňuje požiadať o opravu nesprávnych údajov.</li>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Právo na výmaz</strong> podľa článku 17 ti dáva možnosť požiadať o vymazanie tvojich údajov.</li>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Právo na obmedzenie</strong> podľa článku 18 umožňuje obmedziť spracúvanie tvojich údajov.</li>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Právo na prenosnosť</strong> podľa článku 20 ti dáva možnosť získať svoje údaje v štruktúrovanom formáte.</li>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Právo namietať</strong> podľa článku 21 ti umožňuje namietať proti spracúvaniu tvojich údajov.</li>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Právo odvolať súhlas</strong> podľa článku 7 odseku 3 znamená že môžeš kedykoľvek odvolať súhlas so spracúvaním bez vplyvu na zákonnosť predchádzajúceho spracovania.</li>
        </ul>
        <p style={s}>Žiadosť zašli na <a href="mailto:support@ticklydo.com" style={link}>support@ticklydo.com</a> a odpovieme do 30 dní. Ak sa domnievate že s tvojimi údajmi nenakladáme správne, môžeš podať sťažnosť na <a href="https://dataprotection.gov.sk" target="_blank" style={link}>dataprotection.gov.sk</a>.</p>

        <h2 style={h}>Zmeny podmienok</h2>
        <p style={s}>O zmenách ťa budeme informovať emailom alebo oznámením v aplikácii aspoň 14 dní vopred v súlade s článkom 13 GDPR.</p>

        <h2 style={h}>Kontakt</h2>
        <p style={s}><a href="mailto:support@ticklydo.com" style={link}>support@ticklydo.com</a></p>
      </div>
    </div>
  );
}