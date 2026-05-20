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
        <h1 style={{color:"#f0eeff",fontFamily:"sans-serif",fontSize:"26px",marginBottom:"4px"}}>Zásady ochrany osobných údajov</h1>
        <p style={{color:"rgba(200,190,255,0.4)",fontFamily:"sans-serif",fontSize:"13px",marginBottom:"32px"}}>Platné od: máj 2026 · ticklydo.com</p>

        <h2 style={h}>Aké údaje zbierame</h2>
        <p style={s}>TicklyDo zbiera nasledovné údaje: osobné identifikačné údaje ako email a meno, obsah ktorý vytvoríš v aplikácii ako tasky, nápady a kalendárne záznamy, a technické údaje ako IP adresa a typ zariadenia.</p>

        <h2 style={h}>Ako zbierame tvoje údaje</h2>
        <p style={s}>Väčšinu údajov nám poskytuješ priamo ty. Zbierame a spracúvame údaje keď sa registruješ alebo prihlásiš do TicklyDo, keď vytváraš a spravuješ obsah v aplikácii, a keď používaš naše služby prostredníctvom cookies.</p>
        <p style={s}>TicklyDo môže získavať tvoje údaje nepriamo z nasledovných zdrojov: pri prihlásení cez Google získavame email, meno a profilovú fotku z tvojho Google účtu.</p>

        <h2 style={h}>Ako budeme tvoje údaje používať</h2>
        <p style={s}>TicklyDo zbiera tvoje údaje aby mohla spravovať tvoj účet a poskytovať ti prístup k aplikácii, ukladať obsah ktorý vytvoríš, a zabezpečiť fungovanie prihlásenia a autentifikácie.</p>
        <p style={s}>TicklyDo nezdieľa tvoje údaje s partnerskými spoločnosťami na marketingové účely.</p>

        <h2 style={h}>Ako uchovávame tvoje údaje</h2>
        <p style={s}>TicklyDo bezpečne uchováva tvoje údaje v Google Firebase, čo je cloudová databáza spoločnosti Google LLC. Dáta môžu byť uložené na serveroch v EÚ alebo USA. Google LLC je certifikovaná podľa EU-US Data Privacy Framework. Viac informácií nájdeš na <a href="https://policies.google.com/privacy" target="_blank" style={link}>policies.google.com/privacy</a>.</p>
        <p style={s}>TicklyDo bude uchovávať tvoje údaje po dobu existencie tvojho účtu. Po vymazaní účtu budú tvoje údaje vymazané do 30 dní.</p>

        <h2 style={h}>Právny základ spracovania</h2>
        <p style={s}>Tvoje údaje spracúvame na základe plnenia zmluvy podľa článku 6 odseku 1 písmena b) nariadenia GDPR, keďže spracúvanie je nevyhnutné na poskytovanie služby o ktorú si požiadal. Spracúvanie prebieha tiež na základe tvojho súhlasu podľa článku 6 odseku 1 písmena a) GDPR udeleného pri registrácii.</p>

        <h2 style={h}>Platná legislatíva</h2>
        <p style={s}>Spracúvanie osobných údajov sa riadi Nariadením Európskeho parlamentu a Rady (EÚ) 2016/679 o ochrane fyzických osôb pri spracúvaní osobných údajov (GDPR), Zákonom č. 18/2018 Z. z. o ochrane osobných údajov platným v Slovenskej republike, Zákonom č. 452/2021 Z. z. o elektronických komunikáciách, a Smernicou 2002/58/ES o spracúvaní osobných údajov v sektore elektronických komunikácií.</p>

        <h2 style={h}>Marketing</h2>
        <p style={s}>TicklyDo ti nebude zasielať marketingové správy bez tvojho výslovného súhlasu. Ak by si v budúcnosti súhlas udelil a neskôr ho chcel odvolať, môžeš tak urobiť kedykoľvek kontaktovaním na <a href="mailto:support@ticklydo.com" style={link}>support@ticklydo.com</a>.</p>

        <h2 style={h}>Aké sú tvoje práva na ochranu údajov</h2>
        <p style={s}>TicklyDo chce zabezpečiť aby si bol plne informovaný o všetkých svojich právach na ochranu údajov. Každý používateľ má nárok na nasledovné práva:</p>
        <ul style={{...s, paddingLeft:"20px"}}>
          <li style={{marginBottom:"12px"}}><strong style={{color:"#f0eeff"}}>Právo na prístup</strong> znamená že máš právo požiadať TicklyDo o kópie svojich osobných údajov.</li>
          <li style={{marginBottom:"12px"}}><strong style={{color:"#f0eeff"}}>Právo na opravu</strong> znamená že máš právo požiadať TicklyDo o opravu akýchkoľvek informácií ktoré považuješ za nesprávne, ako aj o doplnenie informácií ktoré považuješ za neúplné.</li>
          <li style={{marginBottom:"12px"}}><strong style={{color:"#f0eeff"}}>Právo na výmaz</strong> znamená že máš právo požiadať TicklyDo o vymazanie svojich osobných údajov za určitých podmienok.</li>
          <li style={{marginBottom:"12px"}}><strong style={{color:"#f0eeff"}}>Právo na obmedzenie spracovania</strong> znamená že máš právo požiadať TicklyDo o obmedzenie spracovania tvojich osobných údajov za určitých podmienok.</li>
          <li style={{marginBottom:"12px"}}><strong style={{color:"#f0eeff"}}>Právo namietať proti spracovaniu</strong> znamená že máš právo namietať proti spracovaniu tvojich osobných údajov za určitých podmienok.</li>
          <li style={{marginBottom:"12px"}}><strong style={{color:"#f0eeff"}}>Právo na prenosnosť údajov</strong> znamená že máš právo požiadať TicklyDo o prenos údajov ktoré sme zhromaždili inej organizácii alebo priamo tebe za určitých podmienok.</li>
          <li style={{marginBottom:"12px"}}><strong style={{color:"#f0eeff"}}>Právo odvolať súhlas</strong> znamená že môžeš kedykoľvek odvolať súhlas so spracúvaním bez vplyvu na zákonnosť predchádzajúceho spracovania.</li>
        </ul>
        <p style={s}>Ak podáš žiadosť, máme jeden mesiac na odpoveď. Ak chceš uplatniť ktorékoľvek z týchto práv, kontaktuj nás na <a href="mailto:support@ticklydo.com" style={link}>support@ticklydo.com</a>.</p>

        <h2 style={h}>Cookies</h2>
        <p style={s}>Cookies sú textové súbory uložené vo tvojom prehliadači ktoré zbierajú štandardné informácie o prihlásení. Keď navštíviš TicklyDo, môžeme automaticky zbierať informácie prostredníctvom cookies.</p>

        <h2 style={h}>Ako používame cookies</h2>
        <p style={s}>TicklyDo používa cookies na zachovanie tvojej prihlasovacej relácie. Nepoužívame reklamné ani sledovacie cookies tretích strán.</p>

        <h2 style={h}>Zásady ochrany osobných údajov iných webových stránok</h2>
        <p style={s}>TicklyDo môže obsahovať odkazy na iné webové stránky. Naše zásady ochrany osobných údajov sa vzťahujú iba na TicklyDo, preto ak klikneš na odkaz na inú webovú stránku, mali by si si prečítať ich zásady ochrany osobných údajov.</p>

        <h2 style={h}>Zmeny zásad ochrany osobných údajov</h2>
        <p style={s}>TicklyDo pravidelne kontroluje svoje zásady ochrany osobných údajov a akékoľvek aktualizácie uverejňuje na tejto stránke. O zmenách ťa budeme informovať emailom alebo oznámením v aplikácii aspoň 14 dní vopred.</p>

        <h2 style={h}>Ako nás kontaktovať</h2>
        <p style={s}>Ak máš akékoľvek otázky týkajúce sa zásad ochrany osobných údajov TicklyDo, údajov ktoré o tebe uchovávame, alebo ak chceš uplatniť niektoré zo svojich práv na ochranu údajov, neváhaj nás kontaktovať na <a href="mailto:support@ticklydo.com" style={link}>support@ticklydo.com</a>.</p>

        <h2 style={h}>Ako kontaktovať príslušný orgán</h2>
        <p style={s}>Ak chceš podať sťažnosť alebo ak máš pocit že TicklyDo nevyriešilo tvoj problém uspokojivým spôsobom, môžeš sa obrátiť na Úrad na ochranu osobných údajov Slovenskej republiky na <a href="https://dataprotection.gov.sk" target="_blank" style={link}>dataprotection.gov.sk</a>.</p>
      </div>
    </div>
  );
}