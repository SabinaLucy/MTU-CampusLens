"""Create an unverified event/room draft; never mutate the production snapshot."""
import argparse
import json
from pathlib import Path
from common import DEFAULT_DATA, SKILL_DIR, find_building, read_snapshot


def main():
    p=argparse.ArgumentParser(description='Create a review-only draft record from a skill asset')
    p.add_argument('--kind', choices=('event','room'),required=True)
    p.add_argument('--building',required=True,help='Existing building ID/name/alias')
    p.add_argument('--output',required=True,help='Path to write draft JSON (not buildings.json)')
    p.add_argument('--data',help='Optional path to buildings.json')
    args=p.parse_args()
    data=read_snapshot(args.data)
    b=find_building(data,args.building)
    if not b:
        p.error('Unknown building; run inspect_building.py --list')
    output=Path(args.output).expanduser().resolve()
    snapshot_path=Path(args.data).resolve() if args.data else DEFAULT_DATA.resolve()
    if output == snapshot_path:
        p.error('Refusing to overwrite production buildings.json')
    if output.exists():
        p.error(f'File already exists (refusing to overwrite): {output}')
    template=SKILL_DIR/'assets'/f'{args.kind}-record-template.json'
    draft=json.loads(template.read_text(encoding='utf-8'))
    draft['building_id']=b['id']
    draft['building_name']=b['name']
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(draft,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(f'Created unverified {args.kind} draft: {output}')
    print('Do not publish without an official MTU source, full verification, and review.')

if __name__=='__main__':
    main()
