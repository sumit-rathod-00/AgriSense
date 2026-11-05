import { DEMONSTRATION_THRESHOLDS } from '../lib/recommendationEngine'

export default function About() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">AgriSense</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          AgriSense is a browser-based demonstration of a digital agriculture monitoring and decision support
          dashboard. It is designed for a university project walkthrough: farms, crop readings, charts, reports, and a
          transparent irrigation recommendation engine — with a budget of ₹0 and no paid APIs, sensors, or trained
          machine learning models.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Architecture</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>React 19 UI compiled by Vite, styled with Tailwind CSS.</li>
            <li>Client-side routing with React Router.</li>
            <li>Charts with Recharts; icons with Lucide.</li>
            <li>Persistent farms, readings, and uploaded datasets in <code>localStorage</code> under key <code>agrisense.v1</code>.</li>
            <li>CSV and Excel parsing, statistics, batch recommendations, and PDF reports all run in the browser.</li>
            <li>No backend, no IoT devices, and no paid cloud services at runtime.</li>
            <li>Static hosting ready for GitHub and Vercel (SPA rewrite to <code>index.html</code>).</li>
          </ul>
        </article>
        <article className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Recommendation engine</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            The Smart Irrigation Recommendation Engine is a configurable if-then rule set. Moisture is the primary
            driver. Crop demo profiles shift the suggested action when moisture is far from a labelled target. Soil pH
            and temperature add explanatory modifiers. Every result lists the thresholds that fired.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Current demonstration moisture bands: very dry below {DEMONSTRATION_THRESHOLDS.moisture.veryDry}%, dry
            below {DEMONSTRATION_THRESHOLDS.moisture.dry}%, adequate up to {DEMONSTRATION_THRESHOLDS.moisture.adequateMax}
            %, wet above {DEMONSTRATION_THRESHOLDS.moisture.wet}%. These numbers are illustrative.
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h3 className="text-base font-semibold text-amber-950">Limits of this demonstration</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-950">
          <li>Recommendations are not scientifically validated agricultural advice.</li>
          <li>The application does not use a trained machine learning model.</li>
          <li>No physical sensors, IoT devices, or live weather feeds are connected.</li>
          <li>Uploaded measurements are not replaced with sample values. The bundled sample file is synthetic test data.</li>
          <li>Clearing browser storage removes manual records and uploaded datasets saved on this computer.</li>
        </ul>
      </section>
    </div>
  )
}
