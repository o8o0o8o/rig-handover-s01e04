import type { DigestRow, Night } from '../digest/types.js';

const dash = (v: string | null) => v ?? '—';

function Row(props: { row: DigestRow }) {
  const r = props.row;
  const warn = r.retries >= 3 || r.lastStatus === 'fail';
  return (
    <tr class={warn ? 'warn' : undefined}>
      <td>{r.job}</td>
      <td>{dash(r.owner)}</td>
      <td>{r.runs}</td>
      <td>{r.retries}</td>
      <td>{r.lastStatus}</td>
      <td>{dash(r.lastError)}</td>
      <td>{r.firstAt}</td>
      <td>{r.lastAt}</td>
    </tr>
  );
}

export function DigestPage(props: { night: Night }) {
  const { night } = props;
  return (
    <>
      <h1>digest {night.night}</h1>
      {night.badLines > 0 && <p class="mute">{night.badLines} line(s) did not parse</p>}
      {night.rows.length === 0 ? (
        <p>nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {night.rows.map((row) => (
              <Row row={row} />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
