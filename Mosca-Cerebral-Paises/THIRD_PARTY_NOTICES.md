# Third-party notices — Mosca Cerebral Países

## Male CNS v1.0 connectome

The real-connectome mode uses data derived from **Male CNS v1.0**, produced by Janelia FlyEM / HHMI Janelia with Google Research and collaborators.

- Project: https://male-cns.janelia.org/
- Official download page: https://male-cns.janelia.org/download/
- Dataset: `male-cns:v1.0`
- Dataset license: **CC BY 4.0**

The website loads a browser-optimized packed graph (`graph.flyg`) and metadata (`meta.json`) prepared by the open-source project `Lulzx/fly-brain`. These packed files are derived from Male CNS v1.0 and retain the dataset's attribution requirements.

## fly-brain codec

Parts of the FLYG decoder in `real/rc.js` and `real/graph.js` are adapted from:

- https://github.com/Lulzx/fly-brain
- MIT License
- Copyright (c) 2026 lulzx

MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Scientific limitation

A connectome is a wiring diagram, not a complete physiological model of a living brain. The real-connectome explorer shows actual connectivity and synaptic weights from the packed Male CNS graph. The simplified Life, Laboratory, Evolution and teaching simulations elsewhere in Mosca Cerebral Países are educational experiments and should not be interpreted as validated predictions of fly behaviour.
