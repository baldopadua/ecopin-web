import xml.etree.ElementTree as ET

tree = ET.parse('c:/Users/PLPASIG/Desktop/ecopin-web/public/pasig.svg')
root = tree.getroot()

# Ensure defs exists
defs = root.find('{http://www.w3.org/2000/svg}defs')
if defs is None:
    defs = ET.Element('{http://www.w3.org/2000/svg}defs')
    root.insert(0, defs)

pattern_xml = """<pattern id="diagonalHatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="6" stroke="#0052CC" stroke-width="2" /></pattern>"""
pattern = ET.fromstring(pattern_xml)
defs.append(pattern)

path = root.find('.//{http://www.w3.org/2000/svg}path')
path.set('style', '') # Clear inline style
path.set('fill', 'url(#diagonalHatch)')
path.set('stroke', '#0052CC')
path.set('stroke-width', '1')

tree.write('c:/Users/PLPASIG/Desktop/ecopin-web/public/pasig.svg', encoding='utf-8', xml_declaration=True)
