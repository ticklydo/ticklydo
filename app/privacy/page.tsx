"use client";
import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();
  const s = {color:"rgba(200,190,255,0.8)",fontFamily:"sans-serif",lineHeight:"1.7",marginBottom:"24px"};
  const h = {color:"#f0eeff",fontFamily:"sans-serif",marginTop:"32px",marginBottom:"8px",fontSize:"17px"};
  const link = {color:"#c084fc"};
  return (
    <div style={{minHeight:"100vh",background:"#07070f",padding:"40px 20px"}}>
      <div style={{maxWidth:"700px",margin:"0 auto"}}>
        <button onClick={() => router.push("/")} style={{background:"none",border:"none",color:"#c084fc",cursor:"pointer",fontFamily:"sans-serif",marginBottom:"24px"}}>← Späť</button>
        <h1 style={{color:"#f0eeff",fontFamily:"sans-serif",fontSize:"26px",marginBottom:"4px"}}>Podmienky & GDPR</h1>
        <p style={{color:"rgba(200,190,255,0.4)",fontFamily:"sans-serif",fontSize:"13px",marginBottom:"32px"}}>Platné od: máj 2026 · ticklydo.com</p>

        <h2 style={h}>Kto prevádzkuje túto aplikáciu</h2>
        <p style={s}>TicklyDo je aplikácia na správu taskov, nápady a kalendár prevádzkovaná na Slovensku. Kontakt pre všetky otázky vrátane ochrany osobných údajov: <a href="mailto:support@ticklydo.com" style={link}>support@ticklydo.com</a></p>

        <h2 style={h}>Ako funguje aplikácia</h2>
        <p style={s}>TicklyDo ti umožňuje vytvárať a spravovať tasky, zapisovať nápady a sledovať kalendár na jednom mieste. Po prihlásení sú tvoje dáta uložené v cloudovej databáze Firebase a dostupné z akéhokoľvek zariadenia. Obsah ktorý vytvoríš zostáva súkromný a viditeľný len tebe.</p>

        <h2 style={h}>Prihlásenie a registrácia</h2>
        <p style={s}>Môžeš sa zaregistrovať emailom a heslom alebo rýchlo cez Google účet. Pri registrácii emailom nikdy neukladáme heslo v čitateľnej podobe — je uložené ako nečitateľný hash v Google Firebase Authentication.</p>

        <h2 style={h}>Aké údaje spracúvame</h2>
        <p style={s}>Pri registrácii spracúvame email, meno a heslo (vo forme hash-u). Pri prihlásení cez Google získavame email, meno a profilovú fotku. Pri používaní aplikácie ukladáme obsah ktorý vytvoríš — tasky, nápady a kalendárne záznamy. Technicky zaznamenávame aj IP adresu a typ zariadenia pre účely bezpečnosti.</p>

        <h2 style={h}>Na aký účel a na akom právnom základe</h2>
        <p style={s}>Tvoje údaje spracúvame výlučne za účelom poskytovania služby. Právnym základom je plnenie zmluvy podľa čl. 6 ods. 1 písm. b) nariadenia GDPR a tvoj súhlas podľa čl. 6 ods. 1 písm. a) GDPR udelený pri registrácii.</p>

        <h2 style={h}>Platná legislatíva</h2>
        <p style={s}>Spracúvanie osobných údajov sa riadi nasledovnými predpismi:</p>
        <ul style={{...s, paddingLeft:"20px"}}>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Nariadenie GDPR</strong> — Nariadenie Európskeho parlamentu a Rady (EÚ) 2016/679 o ochrane fyzických osôb pri spracúvaní osobných údajov</li>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Zákon č. 18/2018 Z. z.</strong> — Zákon o ochrane osobných údajov a o zmene a doplnení niektorých zákonov (Slovenská republika)</li>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Zákon č. 452/2021 Z. z.</strong> — Zákon o elektronických komunikáciách (cookies a elektronická komunikácia)</li>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Smernica ePrivacy</strong> — Smernica 2002/58/ES o spracúvaní osobných údajov a ochrane súkromia v sektore elektronických komunikácií</li>
        </ul>
        <p style={s}>Dozorným orgánom pre ochranu osobných údajov v SR je <a href="https://dataprotection.gov.sk" target="_blank" style={link}>Úrad na ochranu osobných údajov SR</a>.</p>

        <h2 style={h}>Kde sú dáta uložené</h2>
        <p style={s}>Tvoje dáta sú uložené v Google Firebase — cloudovej databáze spoločnosti Google LLC. Dáta môžu byť uložené na serveroch v EÚ alebo USA. Google LLC je certifikovaná podľa EU-US Data Privacy Framework. Viac info: <a href="https://policies.google.com/privacy" target="_blank" style={link}>policies.google.com/privacy</a></p>

        <h2 style={h}>Cookies a prihlásenie</h2>
        <p style={s}>Na prihlasovanie používame cookies ktoré zabezpečujú zachovanie relácie v súlade so zákonom č. 452/2021 Z. z. Nepoužívame reklamné ani sledovacie cookies tretích strán.</p>

        <h2 style={h}>Ako dlho údaje uchovávame</h2>
        <p style={s}>Tvoje údaje uchovávame po dobu existencie tvojho účtu. Po vymazaní účtu budú dáta odstránené do 30 dní v súlade s čl. 17 GDPR (právo na výmaz).</p>

        <h2 style={h}>Komu môžu byť údaje sprístupnené</h2>
        <p style={s}>Tvoje údaje nepredávame ani neposkytujeme tretím stranám na marketingové účely. Technicky k nim má prístup Google Firebase ako sprostredkovateľ podľa čl. 28 GDPR, ktorý ich spracúva výlučne v našom mene na základe zmluvy o spracúvaní údajov.</p>

        <h2 style={h}>Prenos mimo EÚ</h2>
        <p style={s}>Dáta môžu byť spracúvané na serveroch Google v USA. Prenos je zabezpečený v súlade s čl. 46 GDPR prostredníctvom štandardných zmluvných doložiek a certifikácie EU-US Data Privacy Framework. Viac info: <a href="https://policies.google.com/privacy" target="_blank" style={link}>policies.google.com/privacy</a></p>

        <h2 style={h}>Tvoje práva</h2>
        <p style={s}>Podľa GDPR máš nasledovné práva:</p>
        <ul style={{...s, paddingLeft:"20px"}}>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Právo na prístup</strong> (čl. 15) — vedieť aké údaje o tebe spracúvame</li>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Právo na opravu</strong> (čl. 16) — opraviť nesprávne údaje</li>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Právo na výmaz</strong> (čl. 17) — požiadať o vymazanie údajov</li>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Právo na obmedzenie</strong> (čl. 18) — obmedziť spracúvanie</li>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Právo na prenosnosť</strong> (čl. 20) — získať svoje údaje v štruktúrovanom formáte</li>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Právo namietať</strong> (čl. 21) — namietať proti spracúvaniu</li>
          <li style={{marginBottom:"8px"}}><strong style={{color:"#f0eeff"}}>Právo odvolať súhlas</strong> (čl. 7 ods. 3) — kedykoľvek odvolať súhlas so spracúvaním bez vplyvu na zákonnosť predchádzajúceho spracovania</li>
        </ul>
        <p style={s}>Žiadosť zašli na <a href="mailto:support@ticklydo.com" style={link}>support@ticklydo.com</a> — odpovieme do 30 dní. Ak sa domnievate že s tvojimi údajmi nenakladáme správne, môžeš podať sťažnosť na <a href="https://dataprotection.gov.sk" target="_blank" style={link}>dataprotection.gov.sk</a>.</p>

        <h2 style={h}>Zmeny podmienok</h2>
        <p style={s}>O zmenách ťa budeme informovať emailom alebo oznámením v aplikácii aspoň 14 dní vopred v súlade s čl. 13 GDPR.</p>

        <h2 style={h}>Kontakt</h2>
        <p style={s}><a href="mailto:support@ticklydo.com" style={link}>support@ticklydo.com</a></p>
      </div>
    </div>
  );
}