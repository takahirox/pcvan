// Original, read-only fiction bundled outside the local world. These controls
// are category D reconstruction, not recovered PC-VAN or UNIX mail syntax.
export const telnetHost = 'mail.demo.example.invalid';
export const telnetAccount = 'demo@' + telnetHost;
export const remoteLetters = [
  {
    number: 1,
    from: '折野 灯 <akari@notes.example.invalid>',
    subject: '土曜日の待ち合わせ',
    date: '1996-11-22 20:15 JST',
    body: 'こんばんは。土曜日は午後二時に駅前の本屋で待っています。\n新しい時刻表を買ったので、帰りの列車も調べておきます。\n雨なら入口の <伝言板> の前で会いましょう。\nそれでは、週末を楽しみにしています。\n灯',
  },
  {
    number: 2,
    from: '紙町 航 <wataru@letters.example.invalid>',
    subject: '写真ができました',
    date: '1996-11-23 09:30 JST',
    body: 'おはようございます。先日の散歩の写真ができました。\n川沿いの木は思ったより明るく写っていました。\n二枚ずつ焼き増ししたので、次に会うときに持っていきます。\n寒くなってきましたね。風邪に気を付けてください。\n航',
  },
] as const;

export type TelnetScreen = 'telnet-directory' | 'telnet-shell' | 'telnet-mailbox' | 'telnet-letter';
export function telnetControls(screen: TelnetScreen): string {
  const commands = screen === 'telnet-directory' ? `OPEN ${telnetHost} / LIST`
    : screen === 'telnet-shell' ? 'MAIL / LOGOUT' : 'LIST / READ 番号 / LOGOUT';
  return `${commands} / HELP / BACK / MAIN`;
}
export function telnetPrompt(screen: TelnetScreen): string {
  return screen === 'telnet-directory' ? 'TELNET=' : screen === 'telnet-shell' ? 'remote-demo$' : 'remote-mail>';
}
export function renderTelnet(screen: TelnetScreen, selected: number): string[] {
  let lines: string[];
  switch (screen) {
    case 'telnet-directory':
      lines = ['TELNET / 接続先一覧', 'ブラウザー内のローカルデモです。外部接続・認証はしません。',
        `接続先: ${telnetHost}（架空）`, `OPEN ${telnetHost}`];
      break;
    case 'telnet-shell':
      lines = [`TELNET / リモートサーバー ${telnetHost}`, `架空アカウント: ${telnetAccount}（自動デモログイン・資格情報不要）`,
        'MAIL: この架空サーバーの同梱メールを読む（PC-VAN電子メールとは別）'];
      break;
    case 'telnet-mailbox':
      lines = [`リモート MAIL / ${telnetAccount} / 一覧：2通`,
        ...remoteLetters.map((letter) => `#${letter.number} Subject: ${letter.subject}\n   From: ${letter.from}`)];
      break;
    case 'telnet-letter': {
      const letter = remoteLetters[selected - 1]!;
      lines = [`リモート MAIL / 本文 #${letter.number}`, `From: ${letter.from}`, `To: ${telnetAccount}`,
        `Subject: ${letter.subject}`, `Date: ${letter.date}`, '', ...letter.body.split('\n')];
      break;
    }
  }
  return [...lines, telnetControls(screen), telnetPrompt(screen)];
}
