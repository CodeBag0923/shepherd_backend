import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router';
import { Job } from '@blocksuite/store';
import { DownloadIcon, ZipTransformer } from '@blocksuite/blocks';
import { SaveIcon } from 'lucide-react';

import BlockSuite from '../blockSuite';
import { configuration } from '../blockSuite/editor/globalDoc';
import ApiService from '../../../../services/ApiService';
import { StyledToolbar } from './styles';

const NewNote = () => {
  const colors = {
    success: 'rgb(32, 173, 87)',
    info: 'rgb(59, 67, 255)',
    danger: 'rgb(239, 50, 50)'
  };
  const [savingState, setSavingState] = useState('');
  const [color, setColor] = useState(colors.info);
  const params = useParams();
  const pdfRef = useRef();
  const [noteId, setNoteId] = useState(params.id || null);

  const saveNote = useCallback(async () => {
    if (savingState === 'Saving note...' || savingState === 'Downloading...')
      return;

    try {
      setColor(colors.info);
      setSavingState('Saving note...');
      const { collection } = configuration;
      const job = new Job({ collection });
      const json = await job.docToSnapshot(configuration.doc);
      const title = json.meta.title || 'Enter Note Title';
      let summary = document.querySelector('affine-note').innerText;
      if (summary.length > 252) summary = `${summary.slice(0, 50)}...`;
      const docMetaTags = document
        .querySelector('doc-meta-tags')
        .shadowRoot.querySelectorAll('.tag-inline');
      const tags = Array.from(docMetaTags).map((tag) => tag.textContent);

      const zip = await ZipTransformer.exportDocs(collection, [
        configuration.doc
      ]);
      const arrayBuffer = await zip.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }

      const note = btoa(binary);
      const data = {
        topic: title,
        tags: tags,
        note: note,
        summary: summary
      };

      if (noteId) {
        await ApiService.updateNote(noteId, data);
        setSavingState('Saved successfully!');
        setColor(colors.success);
      } else {
        const response = await ApiService.createNote(data);
        // setNoteId(response.id);
        setSavingState('Saved successfully!');
        setColor(colors.success);
      }
    } catch (e) {
      setSavingState(`Something went wrong while saving. ${e}`);
      setColor(colors.danger);
    }
  }, [savingState, noteId]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      saveNote();
    }, 10000000000);

    return () => clearInterval(intervalId);
  }, [saveNote]);

  const handleSaveClick = () => {
    saveNote();
  };

  const handleDownloadClick = async () => {
    if (savingState === 'Saving note...' || savingState === 'Downloading...')
      return;

    try {
      setColor(colors.info);
      setSavingState('Downloading...');
      const { collection } = configuration;
      const job = new Job({ collection });
      const json = await job.docToSnapshot(configuration.doc);
      const title = json.meta.title;
      if (title === '') {
        setColor(colors.danger);
        setSavingState('Please set your title.');
        return;
      }

      setSavingState('Downloaded successfully!');
      setColor(colors.success);
    } catch (e) {
      setSavingState(`Something went wrong while downloading. Error: ${e}`);
      setColor(colors.danger);
    }
  };

  return (
    <div>
      <StyledToolbar>
        <button className="saveBtn" onClick={handleSaveClick}>
          <SaveIcon className="icon" size={18} /> Save
        </button>
        {/* <button className='downloadBtn' onClick={handleDownloadClick}>
          <span dangerouslySetInnerHTML={{ __html: DownloadIcon.strings[0] }} />
          Save as PDF
        </button> */}
        <span className="status" style={{ color: color }}>
          {savingState}
        </span>
      </StyledToolbar>
      <BlockSuite ref={pdfRef} />
    </div>
  );
};

export default NewNote;
