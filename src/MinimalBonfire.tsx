import './minimal-bonfire.css';

export function MinimalBonfire({ knight = false, compact = false }: { knight?: boolean; compact?: boolean }) {
  return <svg className={`minimal-bonfire ${knight ? 'with-knight' : ''} ${compact ? 'is-compact' : ''}`} viewBox="0 0 360 280" fill="none" aria-hidden="true">
    <ellipse className="minimal-aura" cx="180" cy="142" rx={knight ? 157 : 117} ry="105" fill="#7391FF" fillOpacity=".33" />
    <ellipse className="minimal-ground" cx="180" cy="242" rx={knight ? 148 : 93} ry="10" fill="#263FAC" fillOpacity=".22" />
    {knight && <g className="minimal-knight">
      <path d="M223 149C248 145 252 161 267 172L290 215Q296 233 276 235L225 230Z" fill="#B64D52" />
      <path d="M231 206Q251 194 269 210L286 231Q290 243 274 244H215Z" fill="#B0C3F1" />
      <path d="M206 140Q236 139 242 170L249 196L218 215L181 189L187 158Z" fill="#536BBA" />
      <path d="M207 158Q225 154 229 174L225 205L195 205L191 175Z" fill="#6A83D0" />
      <path d="M188 193Q204 188 210 203L201 230Q195 238 177 234L173 223Z" fill="#8DA7E2" />
      <path d="M215 195Q231 190 236 205L230 231Q222 240 207 232L204 222Z" fill="#839DDA" />
      <path d="M177 218Q190 214 199 225L199 242H163Q158 227 177 218Z" fill="#5C77C1" />
      <path d="M206 220Q221 214 228 228L230 243H195Q189 228 206 220Z" fill="#536CB4" />
      <path d="M181 157Q192 148 202 160L209 178Q205 190 193 187L178 173Z" fill="#9CB5EA" />
      <path d="M229 156Q242 150 248 163L245 178Q237 188 226 181L220 169Z" fill="#91AAE3" />
      <ellipse cx="198" cy="181" rx="14" ry="11" transform="rotate(20 198 181)" fill="#B9CBF1" />
      <ellipse cx="230" cy="179" rx="14" ry="11" transform="rotate(-20 230 179)" fill="#B0C4ED" />
      <g className="minimal-helmet">
        <path d="M218 60Q222 34 247 43Q267 39 271 57Q287 69 274 79Q260 88 248 73L230 72Z" fill="#F88165" />
        <ellipse cx="215" cy="109" rx="49" ry="46" fill="#94AFE8" />
        <path d="M171 96Q179 69 206 67" stroke="#FFBD6C" strokeWidth="8" strokeLinecap="round" className="minimal-reflection" />
        <rect x="179" y="110" width="72" height="24" rx="12" fill="#263D85" />
        <path d="M190 120Q195 128 201 120M224 120Q229 128 235 120" stroke="#E9EFFF" strokeWidth="3" strokeLinecap="round" />
      </g>
    </g>}
    <g className="minimal-fire-place" transform={knight ? 'translate(4 38) scale(.78)' : 'translate(64 4)'}>
      <g className="minimal-sword">
        <path d="M103 48H127V172L115 189L103 172Z" fill="#C6D2E7" />
        <path d="M115 48H127V172L115 189Z" fill="#A6B7D0" />
        <rect x="106" y="17" width="18" height="45" rx="6" fill="#6F809B" />
        <rect x="79" y="55" width="72" height="14" rx="7" fill="#A6B7CF" />
        <circle cx="115" cy="17" r="13" fill="#D8E2F0" />
      </g>
      <ellipse className="minimal-fire-glow" cx="115" cy="204" rx="87" ry="55" fill="#FFD46B" fillOpacity=".15" />
      <g className="minimal-logs">
        <rect x="38" y="209" width="133" height="28" rx="14" transform="rotate(-19 38 209)" fill="#A9683B" />
        <rect x="65" y="168" width="133" height="28" rx="14" transform="rotate(22 65 168)" fill="#BA7A45" />
        <circle cx="53" cy="224" r="14" fill="#DDA364" />
        <circle cx="180" cy="220" r="14" fill="#DEA66B" />
        <rect x="102" y="191" width="29" height="57" rx="14" fill="#B47B43" />
        <circle cx="117" cy="234" r="14" fill="#E3AC70" />
      </g>
      <g className="minimal-flames">
        <path className="minimal-flame-left" d="M99 215C51 218 41 181 57 155Q60 170 71 171C72 148 92 139 91 120C117 141 101 168 109 179C118 164 131 157 137 142C155 171 149 198 126 210Z" fill="#FF9524" />
        <path className="minimal-flame-main" d="M106 212C70 207 68 179 83 158C91 146 99 133 96 111C126 121 134 143 129 163Q140 159 146 145C171 180 149 218 114 217Z" fill="#FF811C" />
        <path className="minimal-flame-core" d="M109 218C86 215 79 196 91 181Q98 184 102 190C104 174 119 170 119 153C139 170 130 181 138 188Q144 185 147 182C155 205 134 222 109 218Z" fill="#FFDE58" />
      </g>
      <g className="minimal-embers" fill="#FFDC62">
        <path className="minimal-ember ember-one" d="M50 111Q52 98 60 98Q69 99 65 107L58 120Q49 124 50 111Z" />
        <circle className="minimal-ember ember-two" cx="176" cy="122" r="5" />
        <path className="minimal-ember ember-three" d="M165 74L168 80L175 83L168 86L165 93L162 86L155 83L162 80Z" />
      </g>
    </g>
  </svg>;
}
