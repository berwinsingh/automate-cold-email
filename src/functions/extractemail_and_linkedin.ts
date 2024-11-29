export default function extractEmailAndLinkedIn(blocks: any[]) {
    const emailAndLinkedIn = blocks.reduce((acc: any, block: any) => {
      // Check for heading_2 blocks that contain either "Email" or "LinkedIn"
      if (block.type === 'heading_2' && block.heading_2.text) {
        const heading = block.heading_2.text;
        if (heading === 'Email' || heading === 'LinkedIn') {
          // Initialize the section in our accumulator if it doesn't exist
          if (!acc[heading]) {
            acc[heading] = [];
          }
        }
      }
      
      // If we're in a section (Email or LinkedIn), collect the content until next heading or divider
      if (acc.Email || acc.LinkedIn) {
        const currentSection = acc.Email ? 'Email' : 'LinkedIn';
        
        // Only collect paragraph and bulleted_list_item content
        if (block.type === 'paragraph' || block.type === 'bulleted_list_item') {
          const content = block[block.type].text;
          acc[currentSection].push(content);
        }
        
        // Stop collecting when we hit a divider or new heading
        if (block.type === 'divider' || block.type === 'heading_2') {
          if (acc.Email && acc.LinkedIn) {
            // If we have both sections, we're done
            return acc;
          }
        }
      }
      
      return acc;
    }, {});
  
    return emailAndLinkedIn;
  }