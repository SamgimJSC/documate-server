import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Document } from './document.entity';
import { Tag } from './tag.entity';

@Entity('document_tags')
export class DocumentTag {
  @PrimaryColumn({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @PrimaryColumn({ name: 'tag_id', type: 'uuid' })
  tagId: string;

  @ManyToOne(() => Document)
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @ManyToOne(() => Tag)
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}
