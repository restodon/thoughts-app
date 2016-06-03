import React from 'react';
import { findDOMNode } from 'react-dom';
import classNames from 'classnames';
import { find } from 'lodash';

import {
  getThoughts,
  saveThoughts
} from 'utils/storage';

import {
  parseTodos,
  parseHashtags,
  createThought,
  getUnfinishedTodos
} from 'utils/thought';

import {
  isUp,
  isThoughtCreatingKeypress
} from 'utils/keys';

import Thought from 'components/thought';
import Hashtag from 'components/hashtag';
import Notification from 'components/notification';
import FilterBar from 'components/filter-bar';

export default React.createClass({
  getInitialState() {
    return {
      thoughts: getThoughts(),
      editableThoughtId: null,
      currentText: '',
      hashtagFilters: []
    }
  },
  componentDidMount() {
    document.addEventListener('keydown', this.checkForSpecialKey);
  },
  componentWillUnmount() {
    document.removeEventListener('keydown', this.checkForSpecialKey);
  },
  checkForSpecialKey(event) {
    const thoughts = this.state.thoughts;

    // Edit the most recent thought
    if(!this.state.editableThoughtId && isUp(event.keyCode) && thoughts.length > 0) {
      this.resetFilters();
      this.setEditable(thoughts[thoughts.length - 1]);
      return;
    }

    // Create thought
    if(!this.state.editableThoughtId && isThoughtCreatingKeypress(event)) {
      this.resetFilters();

      const newThought = this.createThought('');
      this.setEditable(newThought);
      return;
    }
  },
  createThought(text) {
    const newThought = createThought(text);
    const updatedThoughts = this.state.thoughts.concat(newThought);

    this.setState({
      thoughts: updatedThoughts
    });

    return newThought;
  },
  deleteThought(thought) {
    const updatedThoughts = this.state.thoughts.filter((thoug) =>
      thought !== thoug
    );

    this.setState({
      thoughts: updatedThoughts,
      editableThoughtId: null
    });

    saveThoughts(updatedThoughts);
  },
  setEditable(thought) {
    // Something is already being edited
    if(this.state.editableThoughtId) {
      const editableThought =
        find(this.state.thoughts, {id: this.state.editableThoughtId});
      this.stopEditing(editableThought);
    }

    this.setState({
      editableThoughtId: thought.id
    }, () => {
      this.refs['thought-' + thought.id].focus();
    });
  },
  stopEditing(thought) {
    this.resetEditable();

    if(thought.text.trim() === '') {
      this.deleteThought(thought);
      return;
    }

    saveThoughts(this.state.thoughts);
  },
  resetEditable() {
    this.setState({ editableThoughtId: null });
  },
  addFilter(hashtag) {
    const filterExists = this.state.hashtagFilters.indexOf(hashtag) > -1;

    if(filterExists) {
      return;
    }

    this.setState({
      hashtagFilters: this.state.hashtagFilters.concat(hashtag)
    });
  },
  removeFromFilter(hashtag) {
    this.setState({
      hashtagFilters: this.state.hashtagFilters.filter((hash) => hash !== hashtag)
    });
  },
  resetFilters() {
    this.setState({
      hashtagFilters: []
    });
  },
  updateThought(thought, newThought) {
    const updatedThoughts = this.state.thoughts.map((thoug) => {
      if(thoug !== thought) {
        return thoug;
      }
      return newThought;
    });

    this.setState({
      thoughts: updatedThoughts
    });

    saveThoughts(updatedThoughts);
  },
  render() {
    const thoughts = this.state.thoughts;
    const hashtagFilters = this.state.hashtagFilters;

    const unfinishedTodos = getUnfinishedTodos(thoughts);

    const filteredThoughts = hashtagFilters.length === 0 ?
      thoughts :
      thoughts.filter((thought) => {
        return hashtagFilters.every((hashtag) =>
          thought.hashtags.indexOf(hashtag) > -1
        );
      });

    return (
      <div className="thoughts-container" onClick={this.resetEditable}>

        <FilterBar
          hashtags={hashtagFilters}
          onRemoveTag={this.removeFromFilter}
          onReset={this.resetFilters} />

        {
          unfinishedTodos.length > 0 && (
            <Notification onClick={() => this.addFilter('unfinished-todo')} />
          )
        }
        <div ref="thoughts" className="thoughts">
          {
            filteredThoughts.map((thought, i) => {
              return (
                <Thought
                  key={i}
                  ref={`thought-${thought.id}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    this.setEditable(thought);
                  }}
                  onChange={(newThought) =>
                    this.updateThought(thought, newThought)}
                  onSubmit={() => this.stopEditing(thought)}
                  onCancel={() => this.stopEditing(thought)}
                  onDelete={() => this.deleteThought(thought)}
                  onHashtagClicked={this.addFilter}
                  editable={this.state.editableThoughtId === thought.id}
                  thought={thought} />

              )
            })
          }
        </div>
      </div>
    );
  }
});
