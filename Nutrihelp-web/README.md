## Getting Started
These instructions will get you a copy of the web frontend up and running on your local machine for development and 
testing purposes.

### Requirements
- **Node.js**: Required to run the web frontend locally.

### Installation

1. **Install Node.js**: Download and install the latest version from [https://nodejs.org/en/download/](https://nodejs.org/en/download/).
2. **Install dependencies**:
``` 
npm install
```
3. **Run the project:**
```
npm start
```

## Nutrihelp Frontend PR Submission Guidelines

### 1. Preparation Before Submission

**Update your local repository**: Before submitting, make sure your local branch is up to date with the remote main branch to avoid conflicts:

```
git pull origin main
```

**Local testing**: Run and test your changes locally to ensure everything works as expected and no errors are introduced.

**Selective file staging**: Only add files related to your changes. Avoid staging all files at once.

Recommended approach:
```
git add src/routes/Settings/index.tsx
git add src/components/TextToSpeech/TTS.tsx
```

This helps prevent unrelated files (such as logs or environment files) from being committed.

### 2. Commit Changes

Use short and clear commit messages that describe the purpose of your changes:

```
git commit -m "feat(settings): add voice controls"
```

### 3. Push Your Branch

Choose your branch prefix based on the type of work:

For new features: `git push origin feature/your-branch-name`
For bug fixes: `git push origin fix/your-branch-name`

This makes it easier for the team to understand the purpose of the branch.

### 4. Create a Pull Request

1. Log in to GitHub and navigate to the project repository.
2. Click Pull requests → New pull request.
3. On the new PR page:
   - Set the base branch to main
   - Set the compare branch to your pushed branch.
4. Click Create pull request.

### 5. Fill Out PR Information

**Title**: Provide a brief summary of the changes, e.g.:
- feat(settings): add voice controls
- fix(navbar): resolve overlap issue

**Description** (must include the following):
1. List of modified or new files
2. A short explanation of the main changes
3. Related screenshots or recordings

Example:

```
## Modified or New Files
- src/routes/Settings/index.tsx (new)
- src/components/TextToSpeech/TTS.tsx (modified)

## Change Summary
- Added voice control sliders
- Improved TTS component responsiveness

## Screenshots
![Example Screenshot](url)
```

### 6. Invite Reviewers

After creating the PR, make sure to invite two project leads as Reviewers.
Reviewers will either:
- Approve and merge the code, or
- Leave comments with feedback for changes.

### 7. Address Feedback

If reviewers request changes:
1. Make the required changes locally
2. Run git add and git commit again
3. Push to the same branch:

```
git push origin feature/your-branch-name
```

GitHub will automatically update the existing PR with your new commits.

### 8. Merge Completion

Once the reviewers approve and merge into the main branch, the PR is considered complete.
No further manual task updates are required—the team will confirm the status after merging.
