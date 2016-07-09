import React from 'react';
import { find } from 'lodash';
import { connect } from 'react-redux';
import { findDOMNode } from 'react-dom';

import {
  getUnfinishedTodos,
  UNFINISHED_TODO_TAG
} from 'utils/thought';

import {
  isUp,
  isEsc,
  isEnter,
  isThoughtCreatingKeypress,
  isBackspace
} from 'utils/keys';

import Thought from 'components/thought';

import Notification from 'components/notification';
import FilterBar from 'components/filter-bar';
import Scaler from 'components/scaler';
import Background from 'components/background';
import Search from 'components/search';
import LoadingOverlay from 'components/loading-overlay';

import {
  createThought,
  deleteThought,
  modifyThought,
  stopEditing,
  setEditable,
  resetFilters,
  removeFilter,
  addFilter,
  requestMoreThoughts
} from 'concepts/thoughts/actions';

const App = React.createClass({
  componentDidMount() {
    document.addEventListener('keydown', this.checkForSpecialKey, true);
    window.addEventListener('scroll', this.requestMoreThoughts, true);
  },
  componentWillUnmount() {
    document.removeEventListener('keydown', this.checkForSpecialKey, true);
    window.removeEventListener('scroll', this.requestMoreThoughts, true);
  },
  getScrollPercentage() {
    const scrollArea = findDOMNode(this.refs.thoughts);
    return scrollArea.scrollTop / (scrollArea.scrollHeight - scrollArea.clientHeight);
  },
  requestMoreThoughts() {
    if (this.getScrollPercentage() > 0.9) {
      this.props.dispatch(requestMoreThoughts());
    }
  },
  updateThought(thought) {
    this.props.dispatch(modifyThought(thought));
  },
  deleteThought(thought) {
    this.props.dispatch(deleteThought(thought));
  },
  setEditable(thought) {
    this.props.dispatch(setEditable(thought));
  },
  stopEditing(thought) {
    this.props.dispatch(stopEditing(thought));
  },
  addFilter(hashtag) {
    this.props.dispatch(addFilter(hashtag));
  },
  removeFromFilter(hashtag) {
    this.props.dispatch(removeFilter(hashtag));
  },
  resetFilters() {
    this.props.dispatch(resetFilters());
  },
  resetEditable() {
    const id = this.props.editableThoughtId;
    if (id) {
      const thought = find(this.props.thoughts, { id });
      this.props.dispatch(stopEditing(thought));
    }
  },
  checkForSpecialKey(event) {
    const thoughts = this.props.thoughts;
    const editing = this.props.editableThoughtId !== null;

    // Edit the most recent thought
    if (!editing && isUp(event.keyCode) && thoughts.length > 0) {
      this.setEditable(thoughts[0]);
      return;
    }

    // Reset filters with ESC
    if (!editing && isEsc(event.keyCode)) {
      this.resetFilters();
      return;
    }

    if (!editing &&
       isBackspace(event.keyCode) &&
       event.target.tagName !== 'INPUT') {
      event.preventDefault();
    }

    // Create thought
    if (!this.props.editableThoughtId &&
        isThoughtCreatingKeypress(event) &&
        event.target.tagName !== 'INPUT') {
      const initialText = this.props.hashtagFilters.length === 0 ? '' :
          `${this.props.hashtagFilters.join(' ')} `;

      // Prevents event so that thought isnt created with one empty line
      if (isEnter(event.keyCode)) {
        event.preventDefault();
      }


      this.props.dispatch(createThought(initialText));
    }
  },
  render() {
    const thoughts = this.props.thoughts;
    const hashtagFilters = this.props.hashtagFilters;
    const currentlyVisibleThoughts = this.props.currentlyVisibleThoughts;

    const unfinishedTodos = getUnfinishedTodos(thoughts);

    const filteredThoughts = hashtagFilters.length === 0 ?
      thoughts :
      thoughts.filter((thought) => {
        // Show thoughts that match current filters or that have been
        // edited while current filter was on

        const edited = this.props.editedWhileFilterOn.indexOf(thought.id) > -1;

        const hasMatchingTag = hashtagFilters.every((hashtag) =>
          thought.hashtags.indexOf(hashtag) > -1
        );

        return edited || hasMatchingTag;
      });

    // Use thought scaler only when filters are not used
    const ThoughtsWrapper = hashtagFilters.length === 0 ?
      Scaler :
      'div';

    return (
      <Background className="app" onClick={this.resetEditable}>
        <div className="overlays">
          <Search />
          <FilterBar
            hashtags={hashtagFilters}
            thoughts={thoughts}
            onAddTag={this.addFilter}
            onRemoveTag={this.removeFromFilter}
            onReset={this.resetFilters} />

          {
            unfinishedTodos.length > 0 && (
              <Notification onClick={() => this.addFilter(UNFINISHED_TODO_TAG)} />
            )
          }
        </div>
        <ThoughtsWrapper ref="thoughts" className="thoughts">
          {
            filteredThoughts.slice(0, currentlyVisibleThoughts).map((thought) => (
              <Thought
                key={thought.id}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  this.setEditable(thought);
                }}
                onChange={this.updateThought}
                onSubmit={this.stopEditing}
                onCancel={() => this.stopEditing(thought)}
                onDelete={() => this.deleteThought(thought)}
                onHashtagClick={this.addFilter}
                editable={this.props.editableThoughtId === thought.id}
                thought={thought} />
            ))
          }
        </ThoughtsWrapper>
        <LoadingOverlay visible={this.props.board !== 'me' && this.props.thoughtsLoading} />
      </Background>
    );
  }
});

function storeToProps(store) {
  return {
    thoughts: store.thoughts,
    board: store.location.board,
    thoughtsLoading: store.editor.thoughtsLoading,
    editableThoughtId: store.editor.editableThoughtId,
    editedWhileFilterOn: store.editor.editedWhileFilterOn,
    currentlyVisibleThoughts: store.editor.currentlyVisibleThoughts,
    hashtagFilters: store.editor.hashtagFilters
  };
}

export default connect(storeToProps)(App);
